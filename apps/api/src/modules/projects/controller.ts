import type { RequestHandler } from 'express';

import type {
  CreateProjectRequestDto,
  GenerateScriptRequestDto,
  SplitScenesRequestDto,
  UpdateProjectRequestDto
} from '@shorts/shared-types';

import { projectsService } from './service';

export const create: RequestHandler = (req, res) => {
  res.status(201).json(projectsService.create(req.body as CreateProjectRequestDto));
};

export const list: RequestHandler = (_req, res) => {
  res.json(projectsService.list());
};

export const getById: RequestHandler = (req, res) => {
  res.json(projectsService.getById(req.params.id));
};

export const update: RequestHandler = (req, res) => {
  res.json(projectsService.update(req.params.id, req.body as UpdateProjectRequestDto));
};

export const remove: RequestHandler = (req, res) => {
  res.json(projectsService.remove(req.params.id));
};

export const generateScript: RequestHandler = (req, res) => {
  res.json(projectsService.generateScript(req.params.id, req.body as GenerateScriptRequestDto));
};

export const splitScenes: RequestHandler = (req, res) => {
  res.json(projectsService.splitScenes(req.params.id, req.body as SplitScenesRequestDto));
};
