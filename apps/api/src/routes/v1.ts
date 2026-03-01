import { Router } from 'express';

import { HealthResponseSchema } from '@shorts/shared-types';

import { SERVICE_NAME } from '../config/constants';
import { authRouter } from '../modules/auth/router';
import { billingRouter } from '../modules/billing/router';
import { creditsRouter } from '../modules/credits/router';
import { internalRouter } from '../modules/internal/router';
import { projectsRouter } from '../modules/projects/router';
import { rendersRouter } from '../modules/renders/router';
import { templatesRouter } from '../modules/templates/router';
import { usersRouter } from '../modules/users/router';
import { webhooksRouter } from '../modules/webhooks/router';

export const v1Router = Router();

v1Router.get('/health', (_req, res) => {
  const payload = HealthResponseSchema.parse({
    status: 'ok',
    service: SERVICE_NAME
  });

  res.json(payload);
});

v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/credits', creditsRouter);
v1Router.use('/projects', projectsRouter);
v1Router.use('/renders', rendersRouter);
v1Router.use('/templates', templatesRouter);
v1Router.use('/billing', billingRouter);
v1Router.use('/webhooks', webhooksRouter);
v1Router.use('/internal', internalRouter);
