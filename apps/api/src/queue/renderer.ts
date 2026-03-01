import type { QueuedRenderJob } from '../db/render-jobs';
import {
  remotionService,
  RendererPlatformError,
  type RendererResult,
} from '../services/remotion.service';

export async function runRenderer(job: QueuedRenderJob): Promise<RendererResult> {
  return remotionService.render(job);
}

export function classifyRenderFailure(error: unknown): {
  reason: string;
  refundEligible: boolean;
} {
  if (error instanceof RendererPlatformError) {
    return {
      reason: `${error.code}: ${error.message}`,
      refundEligible: true,
    };
  }

  if (error instanceof Error) {
    return {
      reason: error.message,
      refundEligible: false,
    };
  }

  return {
    reason: 'Unknown render failure',
    refundEligible: false,
  };
}
