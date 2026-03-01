import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AnyZodObject, ZodError } from 'zod';

const buildErrorPayload = (error: ZodError) => ({
  message: 'Validation failed',
  issues: error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message
  }))
});

export const validateBody = (schema: AnyZodObject): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json(buildErrorPayload(result.error));
    return;
  }

  req.body = result.data;
  next();
};

export const validateParams = (schema: AnyZodObject): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json(buildErrorPayload(result.error));
    return;
  }

  req.params = result.data;
  next();
};

export const validateQuery = (schema: AnyZodObject): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json(buildErrorPayload(result.error));
    return;
  }

  req.query = result.data;
  next();
};
