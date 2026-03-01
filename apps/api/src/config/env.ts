import { z } from 'zod';

import { DEFAULT_PORT, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from './constants';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  RENDER_WORKER_ENABLED: z.coerce.boolean().default(false),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(RATE_LIMIT_WINDOW_MS),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(RATE_LIMIT_MAX_REQUESTS)
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
