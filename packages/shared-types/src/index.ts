export * from './common';
export * from './misc';
export * from './domains/auth';
export * from './domains/projects';
export * from './domains/scenes';
export * from './domains/renders';
export * from './domains/billing';

// Compatibility aliases for existing app imports.
export {
  AuthRegisterSchema as AuthRegisterRequestSchema,
  AuthTokensSchema as AuthRegisterResponseSchema,
  AuthLoginSchema as AuthLoginRequestSchema,
  AuthTokensSchema as AuthLoginResponseSchema,
  AuthRefreshSchema as AuthRefreshRequestSchema
} from './domains/auth';

export type {
  AuthRegisterDto as AuthRegisterRequestDto,
  AuthTokensDto as AuthRegisterResponseDto,
  AuthLoginDto as AuthLoginRequestDto,
  AuthTokensDto as AuthLoginResponseDto,
  AuthRefreshDto as AuthRefreshRequestDto
} from './domains/auth';

export {
  ProjectListItemSchema as ProjectSchema,
  ProjectCreateSchema as CreateProjectRequestSchema,
  ProjectUpdateSchema as UpdateProjectRequestSchema
} from './domains/projects';

export type {
  ProjectCreateDto as CreateProjectRequestDto,
  ProjectUpdateDto as UpdateProjectRequestDto
} from './domains/projects';

export {
  SceneSplitRequestSchema as SplitScenesRequestSchema,
  SceneSplitResultSchema as SplitScenesResponseSchema
} from './domains/scenes';

export type { SceneSplitRequestDto as SplitScenesRequestDto, SceneSplitResultDto as SplitScenesResponseDto } from './domains/scenes';

export {
  RenderEnqueueSchema as CreateRenderRequestSchema,
  RenderEnqueueResponseSchema as CreateRenderResponseSchema,
  RenderJobStatusSchema as RenderJobSchema
} from './domains/renders';

export type { RenderEnqueueDto as CreateRenderRequestDto, RenderEnqueueResponseDto as CreateRenderResponseDto } from './domains/renders';

export { BillingSubscriptionSummarySchema as BillingSubscriptionResponseSchema } from './domains/billing';

export type { BillingSubscriptionSummaryDto as BillingSubscriptionResponseDto } from './domains/billing';
