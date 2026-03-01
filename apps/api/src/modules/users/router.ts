import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import * as controller from './controller';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, controller.me);
