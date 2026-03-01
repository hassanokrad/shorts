import type { RequestHandler } from 'express';

import { webhooksService } from './service';

export const stripe: RequestHandler = async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const signatureHeader = req.header('stripe-signature');

  const result = await webhooksService.stripe(rawBody, signatureHeader);
  if (result.duplicate) {
    res.status(200).json(result.body);
    return;
  }

  res.status(200).json(result.body);
};
