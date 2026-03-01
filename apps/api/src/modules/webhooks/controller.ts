import type { RequestHandler } from 'express';

import type { StripeWebhookRequestDto } from '@shorts/shared-types';

import { webhooksService } from './service';

export const stripe: RequestHandler = (req, res) => {
  res.json(webhooksService.stripe(req.body as StripeWebhookRequestDto));
};
