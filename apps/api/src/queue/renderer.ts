import type { QueuedRenderJob } from '../db/render-jobs';

export class RendererPlatformError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, opts: { code?: string; retryable?: boolean } = {}) {
    super(message);
    this.name = 'RendererPlatformError';
    this.code = opts.code ?? 'PLATFORM_FAILURE';
    this.retryable = opts.retryable ?? false;
  }
}

export type RendererResult = {
  outputUrl: string;
};

const stubLatencyMs = Number(process.env.RENDERER_STUB_LATENCY_MS ?? 25);

export async function runRenderer(job: QueuedRenderJob): Promise<RendererResult> {
  await new Promise((resolve) => setTimeout(resolve, stubLatencyMs));

  if (job.templateId === 'platform-fail-template') {
    throw new RendererPlatformError('Renderer platform temporary outage', {
      code: 'PLATFORM_TEMPORARY',
      retryable: true,
    });
  }

  if (job.templateId === 'platform-invalid-template') {
    throw new RendererPlatformError('Renderer platform rejected template', {
      code: 'PLATFORM_INVALID_TEMPLATE',
      retryable: false,
    });
  }

  return {
    outputUrl: `https://cdn.example.com/renders/${job.id}.mp4`,
  };
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
