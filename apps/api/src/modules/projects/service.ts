import {
  CreateProjectResponseSchema,
  DeleteProjectResponseSchema,
  GenerateScriptResponseSchema,
  GetProjectResponseSchema,
  ListProjectsResponseSchema,
  SplitScenesResponseSchema,
  UpdateProjectResponseSchema,
  type CreateProjectRequestDto,
  type GenerateScriptRequestDto,
  type SplitScenesRequestDto,
  type UpdateProjectRequestDto
} from '@shorts/shared-types';

const makeProject = (id: string, title = 'Stub Project') => ({
  id,
  title,
  status: 'draft',
  createdAt: new Date().toISOString()
});

export const projectsService = {
  create: (payload: CreateProjectRequestDto) => CreateProjectResponseSchema.parse({ project: makeProject('project_1', payload.title) }),
  list: () => ListProjectsResponseSchema.parse({ items: [makeProject('project_1')], nextCursor: null }),
  getById: (id: string) => GetProjectResponseSchema.parse({ project: makeProject(id) }),
  update: (id: string, payload: UpdateProjectRequestDto) => UpdateProjectResponseSchema.parse({ project: makeProject(id, payload.title ?? 'Stub Project') }),
  remove: (_id: string) => DeleteProjectResponseSchema.parse({ success: true }),
  generateScript: (id: string, _payload: GenerateScriptRequestDto) => GenerateScriptResponseSchema.parse({ projectId: id, script: 'Generated script placeholder.' }),
  splitScenes: (id: string, payload: SplitScenesRequestDto) => SplitScenesResponseSchema.parse({
    projectId: id,
    scenes: payload.script.split('.').filter(Boolean).map((text, index) => ({ index: index + 1, text: text.trim() }))
  })
};
