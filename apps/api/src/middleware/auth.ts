import type { NextFunction, RequestHandler, Response } from 'express';

import type { AuthedRequest } from '../types/express';

export const requireAuth: RequestHandler = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    res.status(401).json({ message: 'Unauthorized' });
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
    res.status(401).json({ message: 'Missing internal secret' });
    return;
  }

  req.auth = { userId: 'internal-service', role: 'admin' };
  next();
};
