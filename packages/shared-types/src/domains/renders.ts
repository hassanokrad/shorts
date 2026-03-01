import { z } from 'zod';

export const RenderEnqueueSchema = z.object({
  projectId: z.string(),
  templateId: z.string()
});

export const RenderJobStatusSchema = z.object({
  jobId: z.string(),
  projectId: z.string(),
  status: z.string(),
  createdAt: z.string()
});

export const RenderEnqueueResponseSchema = z.object({
  jobId: z.string(),
  status: z.string()
});

export const GetRenderResponseSchema = z.object({ job: RenderJobStatusSchema });
export const ListRendersResponseSchema = z.object({ items: z.array(RenderJobStatusSchema), nextCursor: z.string().nullable() });
export const CancelRenderResponseSchema = z.object({ jobId: z.string(), canceled: z.boolean() });

export type RenderEnqueueDto = z.infer<typeof RenderEnqueueSchema>;
export type RenderJobStatusDto = z.infer<typeof RenderJobStatusSchema>;
export type RenderEnqueueResponseDto = z.infer<typeof RenderEnqueueResponseSchema>;
export type GetRenderResponseDto = z.infer<typeof GetRenderResponseSchema>;
export type ListRendersResponseDto = z.infer<typeof ListRendersResponseSchema>;
export type CancelRenderResponseDto = z.infer<typeof CancelRenderResponseSchema>;
