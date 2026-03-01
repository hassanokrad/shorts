import { Router } from 'express';

import { requireInternalSecret } from '../../middleware/auth';
import * as controller from './controller';

export const internalRouter = Router();

internalRouter.use(requireInternalSecret);
internalRouter.post('/queue/render-tick', controller.renderTick);
internalRouter.post('/credits/grant-monthly', controller.grantMonthly);
