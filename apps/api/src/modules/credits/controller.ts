import type { RequestHandler } from 'express';

import { z } from 'zod';

import { CursorQuerySchema } from '@shorts/shared-types';

import { creditsService } from './service';

type CursorQueryDto = z.infer<typeof CursorQuerySchema>;

export const balance: RequestHandler = (_req, res) => {
  res.json(creditsService.balance());
};

export const transactions: RequestHandler = (req, res) => {
  res.json(creditsService.transactions(req.query as CursorQueryDto));
};
