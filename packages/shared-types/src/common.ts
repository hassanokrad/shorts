import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  service: z.string()
});

export type HealthResponseDto = z.infer<typeof HealthResponseSchema>;

export const IdParamSchema = z.object({ id: z.string().uuid().or(z.string().min(1)) });
export const JobIdParamSchema = z.object({ jobId: z.string().uuid().or(z.string().min(1)) });

export const CursorQuerySchema = z.object({ cursor: z.string().optional() });
