import type { RequestHandler } from 'express';

import type { CreateRenderRequestDto } from '@shorts/shared-types';

import { rendersService } from './service';

export const create: RequestHandler = (req, res) => {
  res.status(202).json(rendersService.create(req.body as CreateRenderRequestDto));
};

export const getById: RequestHandler = (req, res) => {
  res.json(rendersService.getById(req.params.jobId));
};

export const list: RequestHandler = (_req, res) => {
  res.json(rendersService.list());
};

export const cancel: RequestHandler = (req, res) => {
  res.json(rendersService.cancel(req.params.jobId));
};
