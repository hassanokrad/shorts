import type { RequestHandler } from 'express';

import type { CheckoutSessionRequestDto } from '@shorts/shared-types';

import { billingService } from './service';

export const plans: RequestHandler = (_req, res) => {
  res.json(billingService.plans());
};

export const checkoutSession: RequestHandler = (req, res) => {
  res.status(201).json(billingService.checkoutSession(req.body as CheckoutSessionRequestDto));
};

export const portalSession: RequestHandler = (_req, res) => {
  res.status(201).json(billingService.portalSession());
};

export const subscription: RequestHandler = (_req, res) => {
  res.json(billingService.subscription());
};
