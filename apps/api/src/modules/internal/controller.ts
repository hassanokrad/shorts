import type { RequestHandler } from 'express';

import { internalService } from './service';

export const renderTick: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await internalService.renderTick());
  } catch (error) {
    next(error);
  }
};

export const grantMonthly: RequestHandler = (_req, res) => {
  res.json(internalService.grantMonthly());
};
