import { z } from 'zod';

export const SceneSplitItemSchema = z.object({
  index: z.number().int(),
  text: z.string()
});

export const SceneSplitRequestSchema = z.object({
  script: z.string().min(1)
});

export const SceneSplitResultSchema = z.object({
  projectId: z.string(),
  scenes: z.array(SceneSplitItemSchema)
});

export type SceneSplitItemDto = z.infer<typeof SceneSplitItemSchema>;
export type SceneSplitRequestDto = z.infer<typeof SceneSplitRequestSchema>;
export type SceneSplitResultDto = z.infer<typeof SceneSplitResultSchema>;
