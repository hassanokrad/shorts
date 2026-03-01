import type { RequestHandler } from 'express';

import { templatesService } from './service';

export const list: RequestHandler = (_req, res) => {
  res.json(templatesService.list());
};
