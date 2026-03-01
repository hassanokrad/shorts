import express from 'express';

import { HealthResponseSchema } from '@shorts/shared-types';

import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { v1Router } from './routes/v1';

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.use(express.json());

app.get('/health', (_req, res) => {
  const payload = HealthResponseSchema.parse({
    status: 'ok',
    service: 'api'
  });

  res.json(payload);
});

app.use('/v1', v1Router);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
