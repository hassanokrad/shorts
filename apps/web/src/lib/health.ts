import { HealthResponseSchema } from '@shorts/shared-types';

export const webHealthPayload = HealthResponseSchema.parse({
  status: 'ok',
  service: 'web'
});
