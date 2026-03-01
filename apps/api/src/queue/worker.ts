import {
  claimQueuedRenderJobs,
  markRenderJobFailed,
  markRenderJobSucceeded,
} from '../db/render-jobs';
import { creditsService } from '../modules/credits/service';
import { classifyRenderFailure, runRenderer } from './renderer';

const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_POLL_INTERVAL_MS = 1000;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const renderWorkerConfig = {
  batchSize: parsePositiveInt(process.env.RENDER_WORKER_BATCH_SIZE, DEFAULT_BATCH_SIZE),
  concurrency: parsePositiveInt(process.env.RENDER_WORKER_CONCURRENCY, DEFAULT_CONCURRENCY),
  pollIntervalMs: parsePositiveInt(process.env.RENDER_WORKER_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS),
};

export async function processRenderQueueBatch() {
  const jobs = await claimQueuedRenderJobs(renderWorkerConfig.batchSize);
  const toRun = jobs.slice(0, renderWorkerConfig.concurrency);

  await Promise.all(
    toRun.map(async (job) => {
      try {
        const result = await runRenderer(job);
        await markRenderJobSucceeded({
          jobId: job.id,
          outputUrl: result.outputUrl,
        });
      } catch (error) {
        const failure = classifyRenderFailure(error);

        await markRenderJobFailed({
          jobId: job.id,
          errorMessage: failure.reason,
        });

        if (failure.refundEligible) {
          await creditsService.refundRenderForPlatformFailure({
            jobId: job.id,
            userId: job.userId,
            amount: job.requestedCredits,
            reason: failure.reason,
          });
        }
      }
    }),
  );

  return {
    processed: toRun.length,
  };
}

export function startRenderWorkerLoop() {
  const interval = setInterval(async () => {
    try {
      await processRenderQueueBatch();
    } catch (error) {
      console.error('Render worker loop failed', error);
    }
  }, renderWorkerConfig.pollIntervalMs);

  return () => clearInterval(interval);
}
