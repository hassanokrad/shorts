import express from 'express';

import { HealthResponseSchema } from '@shorts/shared-types';

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.get('/health', (_req, res) => {
  const payload = HealthResponseSchema.parse({
    status: 'ok',
    service: 'api'
  });

  res.json(payload);
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
