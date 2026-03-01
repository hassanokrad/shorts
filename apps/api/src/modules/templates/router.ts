import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import * as controller from './controller';

export const templatesRouter = Router();

templatesRouter.get('/', requireAuth, controller.list);
