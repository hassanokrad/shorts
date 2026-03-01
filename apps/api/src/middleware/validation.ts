import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AnyZodObject, ZodError } from 'zod';

import { ApiError } from './error-handler';

const buildValidationDetails = (error: ZodError): unknown[] =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }));

const validate = <T>(
  value: unknown,
  schema: AnyZodObject,
  next: NextFunction,
  assign: (parsed: T) => void
): void => {
  const result = schema.safeParse(value);
  if (!result.success) {
    next(new ApiError(400, 'validation_error', 'Request validation failed', buildValidationDetails(result.error)));
    return;
  }

  assign(result.data as T);
  next();
};

export const validateBody = (schema: AnyZodObject): RequestHandler => (req: Request, _res: Response, next: NextFunction) => {
  validate(req.body, schema, next, (data) => {
    req.body = data;
  });
};

export const validateParams = (schema: AnyZodObject): RequestHandler => (req: Request, _res: Response, next: NextFunction) => {
  validate(req.params, schema, next, (data) => {
    req.params = data;
  });
};

export const validateQuery = (schema: AnyZodObject): RequestHandler => (req: Request, _res: Response, next: NextFunction) => {
  validate(req.query, schema, next, (data) => {
    req.query = data;
  });
};
