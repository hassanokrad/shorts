import { Prisma, RenderJobStatus } from '@prisma/client';
import { applyCreditTransaction } from './credits';
import { db } from './client';
import { logger } from '../config/logger';
import { InsufficientCreditsError } from './credits';
import { withDbTransaction } from './transaction';

export type EnqueueRenderJobInput = {
  userId: string;
  projectId: string;
  templateId: string;
  requestedCredits: number;
  isWatermarked?: boolean;
};

export type QueuedRenderJob = {
  id: string;
  userId: string;
  projectId: string;
  templateId: string;
  requestedCredits: number;
  isWatermarked: boolean;
};

export async function enqueueRenderJobWithCreditDeduction(
  input: EnqueueRenderJobInput,
  tx?: Prisma.TransactionClient,
) {
  const executor = tx ?? db;

  return withDbTransaction(async (transaction) => {
    const project = await transaction.project.findFirst({
      where: {
        id: input.projectId,
        userId: input.userId,
      },
      select: { id: true },
    });

    if (!project) {
      throw new Error('Project not found for user');
    }

    await transaction.$executeRaw`
      INSERT INTO credit_accounts (user_id, balance, updated_at)
      VALUES (${input.userId}::uuid, 0, now())
      ON CONFLICT (user_id) DO NOTHING
    `;

    const [account] = await transaction.$queryRaw<Array<{ balance: number }>>`
      SELECT balance
      FROM credit_accounts
      WHERE user_id = ${input.userId}::uuid
      FOR UPDATE
    `;

    if (!account || account.balance < Math.abs(input.requestedCredits)) {
      throw new InsufficientCreditsError();
    }

    const nextBalance = account.balance - Math.abs(input.requestedCredits);

    await transaction.creditAccount.update({
      where: { userId: input.userId },
      data: {
        balance: nextBalance,
        updatedAt: new Date(),
      },
    });

    const ledgerTransaction = await transaction.creditTransaction.create({
      data: {
        userId: input.userId,
        type: 'deduct_render',
        amount: -Math.abs(input.requestedCredits),
        balanceAfter: nextBalance,
        metadata: {
          projectId: input.projectId,
          templateId: input.templateId,
          operation: 'enqueue_render',
        },
      },
    });

    const job = await transaction.renderJob.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        templateId: input.templateId,
        status: 'queued',
        progress: 0,
        requestedCredits: Math.abs(input.requestedCredits),
        isWatermarked: input.isWatermarked ?? true,
      },
    });

    logger.info('Render enqueue ledger mutation committed', {
      userId: input.userId,
      jobId: job.id,
      creditTransactionId: ledgerTransaction.id,
      transactionType: ledgerTransaction.type,
      amount: ledgerTransaction.amount,
      balanceAfter: ledgerTransaction.balanceAfter,
    });

    return job;
  }, executor);
}

export async function claimQueuedRenderJobs(limit: number): Promise<QueuedRenderJob[]> {
  return db.$transaction(async (transaction) => {
    const jobs = await transaction.$queryRaw<QueuedRenderJob[]>`
      SELECT id, user_id AS "userId", project_id AS "projectId", template_id AS "templateId",
             requested_credits AS "requestedCredits", is_watermarked AS "isWatermarked"
      FROM render_jobs
      WHERE status = ${RenderJobStatus.queued}::render_job_status
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    `;

    if (jobs.length === 0) {
      return [];
    }

    await transaction.renderJob.updateMany({
      where: {
        id: { in: jobs.map((job) => job.id) },
      },
      data: {
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return jobs;
  });
}

export async function markRenderJobSucceeded(input: { jobId: string; outputUrl: string }) {
  return db.renderJob.update({
    where: { id: input.jobId },
    data: {
      status: 'succeeded',
      progress: 100,
      outputUrl: input.outputUrl,
      finishedAt: new Date(),
      updatedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function markRenderJobFailed(input: {
  jobId: string;
  errorMessage: string;
  progress?: number;
}) {
  return db.renderJob.update({
    where: { id: input.jobId },
    data: {
      status: 'failed',
      progress: input.progress ?? 0,
      errorMessage: input.errorMessage,
      finishedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function refundRenderCredits(input: {
  jobId: string;
  userId: string;
  amount: number;
  reason: string;
}) {
  return withDbTransaction(async (transaction) => {
    const existingRefund = await transaction.creditTransaction.findFirst({
      where: {
        userId: input.userId,
        type: 'refund_render',
        metadata: {
          path: ['jobId'],
          equals: input.jobId,
        },
      },
      select: { id: true },
    });

    if (existingRefund) {
      return existingRefund;
    }

    const refundTxn = await applyCreditTransaction(
      {
        userId: input.userId,
        type: 'refund_render',
        amount: Math.abs(input.amount),
        metadata: {
          jobId: input.jobId,
          reason: input.reason,
          operation: 'render_failure_refund',
        },
      },
      transaction,
    );

    logger.info('Render refund ledger mutation committed', {
      userId: input.userId,
      jobId: input.jobId,
      creditTransactionId: refundTxn.id,
      transactionType: refundTxn.type,
      amount: refundTxn.amount,
      balanceAfter: refundTxn.balanceAfter,
      reason: input.reason,
    });

    return refundTxn;
  });
}
