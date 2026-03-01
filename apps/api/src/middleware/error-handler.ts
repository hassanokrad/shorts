import type { NextFunction, Request, Response } from 'express';

import { logger } from '../config/logger';

interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const sendError = (res: Response, status: number, payload: ErrorResponse): void => {
  res.status(status).json(payload);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, 404, {
    code: 'route_not_found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
};

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  if (error instanceof ApiError) {
    sendError(res, error.status, {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {})
    });
    return;
  }

  logger.error('Unhandled API error', {
    method: req.method,
    path: req.originalUrl,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error
  });

  sendError(res, 500, {
    code: 'internal_server_error',
    message: 'Internal server error'
  });
};
