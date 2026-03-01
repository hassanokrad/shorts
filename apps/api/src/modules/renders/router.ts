import { Router } from 'express';

import { CreateRenderRequestSchema, JobIdParamSchema } from '@shorts/shared-types';

import { requireAuth } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validation';
import * as controller from './controller';

export const rendersRouter = Router();

rendersRouter.use(requireAuth);
rendersRouter.post('/', validateBody(CreateRenderRequestSchema), controller.create);
rendersRouter.get('/', controller.list);
rendersRouter.get('/:jobId', validateParams(JobIdParamSchema), controller.getById);
rendersRouter.post('/:jobId/cancel', validateParams(JobIdParamSchema), controller.cancel);
