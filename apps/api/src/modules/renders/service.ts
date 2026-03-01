import {
  CancelRenderResponseSchema,
  CreateRenderResponseSchema,
  GetRenderResponseSchema,
  ListRendersResponseSchema,
  type CreateRenderRequestDto,
} from '@shorts/shared-types';
import { db, enqueueRenderJobWithCreditDeduction } from '../../db';

const RENDER_CREDIT_COST = Number(process.env.RENDER_CREDIT_COST ?? 1);

const toApiJob = (job: {
  id: string;
  projectId: string;
  status: string;
  createdAt: Date;
}) => ({
  jobId: job.id,
  projectId: job.projectId,
  status: job.status,
  createdAt: job.createdAt.toISOString(),
});

export const rendersService = {
  async create(userId: string, payload: CreateRenderRequestDto) {
    const job = await enqueueRenderJobWithCreditDeduction({
      userId,
      projectId: payload.projectId,
      templateId: payload.templateId,
      requestedCredits: RENDER_CREDIT_COST,
      isWatermarked: true,
    });

    return CreateRenderResponseSchema.parse({
      jobId: job.id,
      status: job.status,
    });
  },

  async getById(userId: string, jobId: string) {
    const job = await db.renderJob.findFirst({
      where: { id: jobId, userId },
      select: {
        id: true,
        projectId: true,
        status: true,
        createdAt: true,
      },
    });

    if (!job) {
      throw new Error('Render job not found');
    }

    return GetRenderResponseSchema.parse({ job: toApiJob(job) });
  },

  async list(userId: string) {
    const jobs = await db.renderJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        projectId: true,
        status: true,
        createdAt: true,
      },
    });

    return ListRendersResponseSchema.parse({
      items: jobs.map(toApiJob),
      nextCursor: null,
    });
  },

  async cancel(userId: string, jobId: string) {
    const job = await db.renderJob.findFirst({
      where: { id: jobId, userId },
      select: { id: true, status: true },
    });

    if (!job) {
      throw new Error('Render job not found');
    }

    const cancelable = job.status === 'queued' || job.status === 'processing';
    if (cancelable) {
      await db.renderJob.update({
        where: { id: jobId },
        data: {
          status: 'canceled',
          finishedAt: new Date(),
          updatedAt: new Date(),
          errorMessage: 'Canceled by user',
        },
      });
    }

    return CancelRenderResponseSchema.parse({ jobId, canceled: cancelable });
  },
};
