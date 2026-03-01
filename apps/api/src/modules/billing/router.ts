import { Router } from 'express';

import { CheckoutSessionRequestSchema } from '@shorts/shared-types';

import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import * as controller from './controller';

export const billingRouter = Router();

billingRouter.use(requireAuth);
billingRouter.get('/plans', controller.plans);
billingRouter.post('/checkout-session', validateBody(CheckoutSessionRequestSchema), controller.checkoutSession);
billingRouter.post('/portal-session', controller.portalSession);
billingRouter.get('/subscription', controller.subscription);
