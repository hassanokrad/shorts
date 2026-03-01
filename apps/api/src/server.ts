import express from 'express';

import { HealthResponseSchema } from '@shorts/shared-types';

import { API_PREFIX, SERVICE_NAME } from './config/constants';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { startRenderWorkerLoop } from './queue/worker';
import { v1Router } from './routes/v1';

const app = express();

app.use(`${API_PREFIX}/webhooks/stripe`, express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(createRateLimitMiddleware());

app.get('/health', (_req, res) => {
  const payload = HealthResponseSchema.parse({
    status: 'ok',
    service: SERVICE_NAME
  });

  res.json(payload);
});

app.use(API_PREFIX, v1Router);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.API_PORT, () => {
  logger.info('API server started', { port: env.API_PORT });

  if (env.RENDER_WORKER_ENABLED) {
    startRenderWorkerLoop();
    logger.info('Render worker loop started');
  }
});
