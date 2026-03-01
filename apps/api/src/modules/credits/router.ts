import { Router } from 'express';

import { CursorQuerySchema } from '@shorts/shared-types';

import { requireAuth } from '../../middleware/auth';
import { validateQuery } from '../../middleware/validation';
import * as controller from './controller';

export const creditsRouter = Router();

creditsRouter.get('/balance', requireAuth, controller.balance);
creditsRouter.get('/transactions', requireAuth, validateQuery(CursorQuerySchema), controller.transactions);
