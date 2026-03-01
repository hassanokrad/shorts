import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  service: z.string()
});

export type HealthResponseDto = z.infer<typeof HealthResponseSchema>;
