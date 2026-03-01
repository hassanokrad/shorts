import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { env } from '../config/env';

import { sendError } from './error-handler';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const requestStore = new Map<string, RateLimitEntry>();

const resolveKey = (req: Request): string => req.ip || req.header('x-forwarded-for') || 'unknown';

export const createRateLimitMiddleware = (): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const now = Date.now();
  const key = resolveKey(req);

  const existing = requestStore.get(key);
  if (!existing || now > existing.resetAt) {
    requestStore.set(key, { count: 1, resetAt: now + env.RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  if (existing.count >= env.RATE_LIMIT_MAX_REQUESTS) {
    sendError(res, 429, {
      code: 'rate_limit_exceeded',
      message: 'Too many requests',
      details: { retryAfterMs: Math.max(existing.resetAt - now, 0) }
    });
    return;
  }

  existing.count += 1;
  requestStore.set(key, existing);
  next();
};
