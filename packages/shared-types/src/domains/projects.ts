import { z } from 'zod';

export const ProjectListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  createdAt: z.string()
});

export const ProjectCreateSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1).optional()
});

export const ProjectUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.string().optional()
});

export const CreateProjectResponseSchema = z.object({ project: ProjectListItemSchema });
export const ListProjectsResponseSchema = z.object({ items: z.array(ProjectListItemSchema), nextCursor: z.string().nullable() });
export const GetProjectResponseSchema = z.object({ project: ProjectListItemSchema });
export const UpdateProjectResponseSchema = z.object({ project: ProjectListItemSchema });
export const DeleteProjectResponseSchema = z.object({ success: z.boolean() });

export const GenerateScriptRequestSchema = z.object({
  tone: z.string().optional(),
  targetDurationSec: z.number().int().positive().optional()
});

export const GenerateScriptResponseSchema = z.object({ projectId: z.string(), script: z.string() });

export type ProjectListItemDto = z.infer<typeof ProjectListItemSchema>;
export type ProjectCreateDto = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdateDto = z.infer<typeof ProjectUpdateSchema>;
export type CreateProjectResponseDto = z.infer<typeof CreateProjectResponseSchema>;
export type ListProjectsResponseDto = z.infer<typeof ListProjectsResponseSchema>;
export type GetProjectResponseDto = z.infer<typeof GetProjectResponseSchema>;
export type UpdateProjectResponseDto = z.infer<typeof UpdateProjectResponseSchema>;
export type DeleteProjectResponseDto = z.infer<typeof DeleteProjectResponseSchema>;
export type GenerateScriptRequestDto = z.infer<typeof GenerateScriptRequestSchema>;
export type GenerateScriptResponseDto = z.infer<typeof GenerateScriptResponseSchema>;
