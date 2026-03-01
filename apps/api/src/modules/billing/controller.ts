import type { RequestHandler } from 'express';

import type { CheckoutSessionRequestDto } from '@shorts/shared-types';

import type { AuthedRequest } from '../../types/express';
import { billingService } from './service';

export const plans: RequestHandler = async (_req, res) => {
  res.json(await billingService.plans());
};

export const checkoutSession: RequestHandler = async (req: AuthedRequest, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.status(201).json(await billingService.checkoutSession(userId, req.body as CheckoutSessionRequestDto));
};

export const portalSession: RequestHandler = async (req: AuthedRequest, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.status(201).json(await billingService.portalSession(userId));
};

export const subscription: RequestHandler = async (req: AuthedRequest, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.json(await billingService.subscription(userId));
};
