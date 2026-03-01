import { Router } from 'express';

import * as controller from './controller';

export const webhooksRouter = Router();

webhooksRouter.post('/stripe', controller.stripe);
