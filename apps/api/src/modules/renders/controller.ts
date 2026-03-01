import type { RequestHandler } from 'express';

import type { CreateRenderRequestDto } from '@shorts/shared-types';

import { InsufficientCreditsError } from '../../db';
import type { AuthedRequest } from '../../types/express';
import { IdempotencyConflictError, RenderJobNotFoundError, rendersService } from './service';

export const create: RequestHandler = async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const idempotencyKeyHeader = req.header('idempotency-key')?.trim();
    const payload = await rendersService.create(
      userId,
      req.body as CreateRenderRequestDto,
      idempotencyKeyHeader || undefined,
    );
    res.status(202).json(payload);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      res.status(400).json({ message: 'Insufficient credits' });
      return;
    }

    if (error instanceof IdempotencyConflictError) {
      res.status(409).json({ message: error.message });
      return;
    }

    next(error);
  }
};

export const getById: RequestHandler = async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    res.json(await rendersService.getById(userId, req.params.jobId));
  } catch (error) {
    if (error instanceof RenderJobNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }

    next(error);
  }
};

export const list: RequestHandler = async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    res.json(await rendersService.list(userId));
  } catch (error) {
    if (error instanceof RenderJobNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }

    next(error);
  }
};

export const cancel: RequestHandler = async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    res.json(await rendersService.cancel(userId, req.params.jobId));
  } catch (error) {
    if (error instanceof RenderJobNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }

    next(error);
  }
};
