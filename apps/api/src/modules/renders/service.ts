import {
  CancelRenderResponseSchema,
  CreateRenderResponseSchema,
  GetRenderResponseSchema,
  ListRendersResponseSchema,
  type CreateRenderRequestDto,
} from '@shorts/shared-types';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { db, enqueueRenderJobWithCreditDeduction } from '../../db';

const RENDER_CREDIT_COST = Number(process.env.RENDER_CREDIT_COST ?? 1);
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

type IdempotencyEnvelope = {
  response: {
    jobId: string;
    status: string;
  };
};

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

export class RenderJobNotFoundError extends Error {
  constructor() {
    super('Render job not found');
    this.name = 'RenderJobNotFoundError';
  }
}

export class IdempotencyConflictError extends Error {
  constructor(message = 'Idempotency key conflict') {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

const buildRequestHash = (payload: CreateRenderRequestDto) =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const parseStoredResponse = (responseBody: Prisma.JsonValue | null) => {
  if (!responseBody || typeof responseBody !== 'object' || !('response' in responseBody)) {
    return null;
  }

  const envelope = responseBody as IdempotencyEnvelope;
  return CreateRenderResponseSchema.parse(envelope.response);
};

const createRenderWithDeduction = async (
  userId: string,
  payload: CreateRenderRequestDto,
  tx?: Prisma.TransactionClient,
) => {
  const job = await enqueueRenderJobWithCreditDeduction({
    userId,
    projectId: payload.projectId,
    templateId: payload.templateId,
    requestedCredits: RENDER_CREDIT_COST,
    isWatermarked: true,
  }, tx);

  return CreateRenderResponseSchema.parse({
    jobId: job.id,
    status: job.status,
  });
};

export const rendersService = {
  async create(userId: string, payload: CreateRenderRequestDto, idempotencyKey?: string) {
    if (!idempotencyKey) {
      return createRenderWithDeduction(userId, payload);
    }

    const requestHash = buildRequestHash(payload);
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

    return db.$transaction(async (transaction) => {
      await transaction.idempotencyKey.upsert({
        where: { key: idempotencyKey },
        create: {
          key: idempotencyKey,
          userId,
          requestHash,
          expiresAt,
        },
        update: {},
      });

      const [idempotencyRecord] = await transaction.$queryRaw<Array<{
        key: string;
        userId: string;
        requestHash: string;
        responseBody: Prisma.JsonValue | null;
      }>>`
        SELECT key, user_id AS "userId", request_hash AS "requestHash", response_body AS "responseBody"
        FROM idempotency_keys
        WHERE key = ${idempotencyKey}
        FOR UPDATE
      `;

      if (!idempotencyRecord) {
        throw new Error('Failed to acquire idempotency key lock');
      }

      if (idempotencyRecord.userId !== userId) {
        throw new IdempotencyConflictError('Idempotency key belongs to another user');
      }

      if (idempotencyRecord.requestHash !== requestHash) {
        throw new IdempotencyConflictError('Idempotency key reused with a different payload');
      }

      const cached = parseStoredResponse(idempotencyRecord.responseBody);
      if (cached) {
        return cached;
      }

      const created = await createRenderWithDeduction(userId, payload, transaction);

      await transaction.idempotencyKey.update({
        where: { key: idempotencyKey },
        data: {
          responseCode: 202,
          responseBody: {
            response: created,
          },
        },
      });

      return created;
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
      throw new RenderJobNotFoundError();
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
      throw new RenderJobNotFoundError();
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
