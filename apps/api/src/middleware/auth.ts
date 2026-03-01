import type { NextFunction, RequestHandler, Response } from 'express';

import { sendError } from './error-handler';

import type { AuthedRequest } from '../types/express';

export const requireAuth: RequestHandler = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    sendError(res, 401, { code: 'unauthorized', message: 'Missing authorization header' });
    return;
  }

  req.auth = { userId: 'stub-user-id', role: 'user' };
  next();
};

export const optionalAuth: RequestHandler = (req: AuthedRequest, _res: Response, next: NextFunction) => {
  if (req.header('authorization')) {
    req.auth = { userId: 'stub-user-id', role: 'user' };
  }
  next();
};

export const requireInternalSecret: RequestHandler = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const secret = req.header('x-internal-secret');
  if (!secret) {
    sendError(res, 401, { code: 'missing_internal_secret', message: 'Missing internal secret' });
    return;
  }

  req.auth = { userId: 'internal-service', role: 'admin' };
  next();
};
