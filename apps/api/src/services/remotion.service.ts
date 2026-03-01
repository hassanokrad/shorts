import { basename } from 'node:path';

import type { QueuedRenderJob } from '../db/render-jobs';
import { db } from '../db/client';

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

type NormalizedScenePayload = {
  index: number;
  text: string;
  durationSec: number;
  visualPrompt: string | null;
};

type NormalizedRenderPayload = {
  jobId: string;
  userId: string;
  project: {
    id: string;
    title: string;
    topic: string | null;
    targetDurationSec: number | null;
  };
  template: {
    id: string;
    code: string;
    name: string;
  };
  options: {
    watermarked: boolean;
  };
  scenes: NormalizedScenePayload[];
};

type RendererApiResponse = {
  outputPath?: string;
  outputUrl?: string;
  mimeType?: string;
};

type UploadResponse = {
  key: string;
  url: string;
};

export type RendererResult = {
  outputUrl: string;
  outputStorageKey: string;
};

const RENDERER_ENDPOINT = process.env.REMOTION_RENDERER_URL ?? 'http://127.0.0.1:4100/render';
const STORAGE_UPLOAD_ENDPOINT = process.env.STORAGE_UPLOAD_URL;
const STORAGE_PUBLIC_BASE_URL = process.env.STORAGE_PUBLIC_BASE_URL ?? 'https://cdn.example.com/renders';
const RENDER_TIMEOUT_MS = Number(process.env.REMOTION_RENDER_TIMEOUT_MS ?? 60_000);
const RENDER_MAX_ATTEMPTS = Number(process.env.REMOTION_RENDER_MAX_ATTEMPTS ?? 2);
const RETRY_BACKOFF_MS = Number(process.env.REMOTION_RENDER_RETRY_BACKOFF_MS ?? 750);

const sleep = async (durationMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

const isRetryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown renderer failure');

function buildStorageFallback(outputPath: string, jobId: string): UploadResponse {
  const suffix = basename(outputPath) || `${jobId}.mp4`;
  const key = `${jobId}/${suffix}`;

  return {
    key,
    url: `${STORAGE_PUBLIC_BASE_URL}/${key}`,
  };
}

async function callRenderer(payload: NormalizedRenderPayload): Promise<RendererApiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  try {
    const response = await fetch(RENDERER_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();

      throw new RendererPlatformError(`Renderer HTTP ${response.status}: ${message || 'empty response'}`, {
        code: 'RENDERER_HTTP_ERROR',
        retryable: isRetryableStatus(response.status),
      });
    }

    return (await response.json()) as RendererApiResponse;
  } catch (error) {
    if (error instanceof RendererPlatformError) {
      throw error;
    }

    const timedOut = error instanceof Error && error.name === 'AbortError';
    throw new RendererPlatformError(
      timedOut ? 'Renderer request timed out' : `Renderer request failed: ${toErrorMessage(error)}`,
      {
        code: timedOut ? 'RENDER_TIMEOUT' : 'RENDER_TRANSPORT_ERROR',
        retryable: true,
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function callRendererWithRetry(payload: NormalizedRenderPayload): Promise<RendererApiResponse> {
  const maxAttempts = Number.isInteger(RENDER_MAX_ATTEMPTS) && RENDER_MAX_ATTEMPTS > 0 ? RENDER_MAX_ATTEMPTS : 1;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await callRenderer(payload);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof RendererPlatformError ? error.retryable : false;
      const shouldRetry = retryable && attempt < maxAttempts;

      if (!shouldRetry) {
        throw error;
      }

      await sleep(RETRY_BACKOFF_MS * attempt);
    }
  }

  throw lastError;
}

async function uploadOutput(jobId: string, sourcePath: string, mimeType?: string): Promise<UploadResponse> {
  if (!STORAGE_UPLOAD_ENDPOINT) {
    return buildStorageFallback(sourcePath, jobId);
  }

  const response = await fetch(STORAGE_UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jobId,
      sourcePath,
      mimeType: mimeType ?? 'video/mp4',
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new RendererPlatformError(`Storage upload failed (${response.status}): ${message || 'empty response'}`, {
      code: 'STORAGE_UPLOAD_FAILED',
      retryable: true,
    });
  }

  const body = (await response.json()) as Partial<UploadResponse>;
  if (!body.key || !body.url) {
    throw new RendererPlatformError('Storage upload response missing key/url', {
      code: 'STORAGE_UPLOAD_INVALID_RESPONSE',
      retryable: false,
    });
  }

  return {
    key: body.key,
    url: body.url,
  };
}

export async function buildNormalizedRenderPayload(job: QueuedRenderJob): Promise<NormalizedRenderPayload> {
  const project = await db.project.findFirst({
    where: {
      id: job.projectId,
      userId: job.userId,
    },
    select: {
      id: true,
      title: true,
      topic: true,
      targetDurationSec: true,
      scenes: {
        orderBy: { sceneIndex: 'asc' },
        select: {
          sceneIndex: true,
          textContent: true,
          durationSec: true,
          visualPrompt: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found for render job');
  }

  const template = await db.renderTemplate.findUnique({
    where: { id: job.templateId },
    select: { id: true, code: true, name: true },
  });

  if (!template) {
    throw new Error('Template not found for render job');
  }

  return {
    jobId: job.id,
    userId: job.userId,
    project: {
      id: project.id,
      title: project.title,
      topic: project.topic,
      targetDurationSec: project.targetDurationSec,
    },
    template,
    options: {
      watermarked: job.isWatermarked,
    },
    scenes: project.scenes.map((scene) => ({
      index: scene.sceneIndex,
      text: scene.textContent,
      durationSec: Number(scene.durationSec),
      visualPrompt: scene.visualPrompt,
    })),
  };
}

export const remotionService = {
  async render(job: QueuedRenderJob): Promise<RendererResult> {
    const payload = await buildNormalizedRenderPayload(job);
    const renderResult = await callRendererWithRetry(payload);

    if (renderResult.outputUrl) {
      const derivedKey = `${job.id}/${basename(renderResult.outputUrl) || `${job.id}.mp4`}`;
      return {
        outputUrl: renderResult.outputUrl,
        outputStorageKey: derivedKey,
      };
    }

    if (!renderResult.outputPath) {
      throw new RendererPlatformError('Renderer response missing outputPath/outputUrl', {
        code: 'INVALID_RENDER_RESULT',
        retryable: false,
      });
    }

    const uploaded = await uploadOutput(job.id, renderResult.outputPath, renderResult.mimeType);
    return {
      outputUrl: uploaded.url,
      outputStorageKey: uploaded.key,
    };
  },
};
