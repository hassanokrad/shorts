import type { RequestHandler } from 'express';

import { usersService } from './service';

export const me: RequestHandler = (_req, res) => {
  res.json(usersService.me());
};
