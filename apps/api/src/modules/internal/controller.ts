import type { RequestHandler } from 'express';

import { internalService } from './service';

export const renderTick: RequestHandler = (_req, res) => {
  res.json(internalService.renderTick());
};

export const grantMonthly: RequestHandler = (_req, res) => {
  res.json(internalService.grantMonthly());
};
