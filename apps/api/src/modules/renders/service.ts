import {
  CancelRenderResponseSchema,
  CreateRenderResponseSchema,
  GetRenderResponseSchema,
  ListRendersResponseSchema,
  type CreateRenderRequestDto
} from '@shorts/shared-types';

const makeJob = (jobId: string) => ({
  jobId,
  projectId: 'project_1',
  status: 'queued',
  createdAt: new Date().toISOString()
});

export const rendersService = {
  create: (_payload: CreateRenderRequestDto) => CreateRenderResponseSchema.parse({ jobId: 'job_1', status: 'queued' }),
  getById: (jobId: string) => GetRenderResponseSchema.parse({ job: makeJob(jobId) }),
  list: () => ListRendersResponseSchema.parse({ items: [makeJob('job_1')], nextCursor: null }),
  cancel: (jobId: string) => CancelRenderResponseSchema.parse({ jobId, canceled: true })
};
