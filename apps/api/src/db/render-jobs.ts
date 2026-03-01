import { Prisma, RenderJobStatus } from '@prisma/client';
import { applyCreditTransaction } from './credits';
import { db } from './client';
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

    await applyCreditTransaction(
      {
        userId: input.userId,
        type: 'deduct_render',
        amount: -Math.abs(input.requestedCredits),
        metadata: {
          projectId: input.projectId,
          templateId: input.templateId,
          operation: 'enqueue_render',
        },
      },
      transaction,
    );

    return transaction.renderJob.create({
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

    return applyCreditTransaction(
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
  });
}
