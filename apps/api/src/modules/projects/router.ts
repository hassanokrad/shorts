import { Router } from 'express';

import {
  CreateProjectRequestSchema,
  GenerateScriptRequestSchema,
  IdParamSchema,
  SplitScenesRequestSchema,
  UpdateProjectRequestSchema
} from '@shorts/shared-types';

import { requireAuth } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validation';
import * as controller from './controller';

export const projectsRouter = Router();

projectsRouter.use(requireAuth);
projectsRouter.post('/', validateBody(CreateProjectRequestSchema), controller.create);
projectsRouter.get('/', controller.list);
projectsRouter.get('/:id', validateParams(IdParamSchema), controller.getById);
projectsRouter.patch('/:id', validateParams(IdParamSchema), validateBody(UpdateProjectRequestSchema), controller.update);
projectsRouter.delete('/:id', validateParams(IdParamSchema), controller.remove);
projectsRouter.post('/:id/generate-script', validateParams(IdParamSchema), validateBody(GenerateScriptRequestSchema), controller.generateScript);
projectsRouter.post('/:id/split-scenes', validateParams(IdParamSchema), validateBody(SplitScenesRequestSchema), controller.splitScenes);
