import { Router } from 'express';

import { StripeWebhookRequestSchema } from '@shorts/shared-types';

import { validateBody } from '../../middleware/validation';
import * as controller from './controller';

export const webhooksRouter = Router();

webhooksRouter.post('/stripe', validateBody(StripeWebhookRequestSchema), controller.stripe);
