import { Prisma } from '@prisma/client';
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
        requestedCredits: Math.abs(input.requestedCredits),
        isWatermarked: input.isWatermarked ?? true,
      },
    });
  }, executor);
}
