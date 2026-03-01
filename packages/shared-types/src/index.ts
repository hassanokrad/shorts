import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  service: z.string()
});

export type HealthResponseDto = z.infer<typeof HealthResponseSchema>;

export const IdParamSchema = z.object({ id: z.string().uuid().or(z.string().min(1)) });
export const JobIdParamSchema = z.object({ jobId: z.string().uuid().or(z.string().min(1)) });

export const CursorQuerySchema = z.object({ cursor: z.string().optional() });

export const AuthRegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});
export const AuthRegisterResponseSchema = z.object({ userId: z.string(), accessToken: z.string(), refreshToken: z.string() });

export const AuthLoginRequestSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const AuthLoginResponseSchema = z.object({ userId: z.string(), accessToken: z.string(), refreshToken: z.string() });

export const AuthRefreshRequestSchema = z.object({ refreshToken: z.string().min(1) });
export const AuthRefreshResponseSchema = z.object({ accessToken: z.string(), refreshToken: z.string() });

export const AuthLogoutRequestSchema = z.object({ refreshToken: z.string().min(1).optional() });
export const AuthLogoutResponseSchema = z.object({ success: z.boolean() });

export const AuthMeResponseSchema = z.object({ userId: z.string(), email: z.string().email(), role: z.string() });

export const UsersMeResponseSchema = z.object({ userId: z.string(), email: z.string().email(), name: z.string().nullable() });

export const CreditsBalanceResponseSchema = z.object({ balance: z.number().int().nonnegative() });
export const CreditsTransactionSchema = z.object({ id: z.string(), amount: z.number().int(), reason: z.string(), createdAt: z.string() });
export const CreditsTransactionsResponseSchema = z.object({ items: z.array(CreditsTransactionSchema), nextCursor: z.string().nullable() });

export const ProjectSchema = z.object({ id: z.string(), title: z.string(), status: z.string(), createdAt: z.string() });
export const CreateProjectRequestSchema = z.object({ title: z.string().min(1), prompt: z.string().min(1).optional() });
export const CreateProjectResponseSchema = z.object({ project: ProjectSchema });
export const ListProjectsResponseSchema = z.object({ items: z.array(ProjectSchema), nextCursor: z.string().nullable() });
export const GetProjectResponseSchema = z.object({ project: ProjectSchema });
export const UpdateProjectRequestSchema = z.object({ title: z.string().min(1).optional(), status: z.string().optional() });
export const UpdateProjectResponseSchema = z.object({ project: ProjectSchema });
export const DeleteProjectResponseSchema = z.object({ success: z.boolean() });
export const GenerateScriptRequestSchema = z.object({ tone: z.string().optional(), targetDurationSec: z.number().int().positive().optional() });
export const GenerateScriptResponseSchema = z.object({ projectId: z.string(), script: z.string() });
export const SplitScenesRequestSchema = z.object({ script: z.string().min(1) });
export const SplitScenesResponseSchema = z.object({ projectId: z.string(), scenes: z.array(z.object({ index: z.number().int(), text: z.string() })) });

export const TemplateSchema = z.object({ id: z.string(), name: z.string(), description: z.string().nullable() });
export const ListTemplatesResponseSchema = z.object({ items: z.array(TemplateSchema) });

export const CreateRenderRequestSchema = z.object({ projectId: z.string(), templateId: z.string() });
export const CreateRenderResponseSchema = z.object({ jobId: z.string(), status: z.string() });
export const RenderJobSchema = z.object({ jobId: z.string(), projectId: z.string(), status: z.string(), createdAt: z.string() });
export const GetRenderResponseSchema = z.object({ job: RenderJobSchema });
export const ListRendersResponseSchema = z.object({ items: z.array(RenderJobSchema), nextCursor: z.string().nullable() });
export const CancelRenderResponseSchema = z.object({ jobId: z.string(), canceled: z.boolean() });

export const BillingPlanSchema = z.object({ id: z.string(), name: z.string(), monthlyCredits: z.number().int() });
export const BillingPlansResponseSchema = z.object({ items: z.array(BillingPlanSchema) });
export const CheckoutSessionRequestSchema = z.object({ planId: z.string() });
export const CheckoutSessionResponseSchema = z.object({ url: z.string().url() });
export const PortalSessionResponseSchema = z.object({ url: z.string().url() });
export const BillingSubscriptionResponseSchema = z.object({ status: z.string(), planId: z.string().nullable() });

export const StripeWebhookRequestSchema = z.object({ type: z.string(), data: z.unknown() });
export const StripeWebhookResponseSchema = z.object({ received: z.boolean() });

export const InternalRenderTickResponseSchema = z.object({ triggered: z.boolean() });
export const InternalGrantMonthlyResponseSchema = z.object({ processed: z.number().int().nonnegative() });

export type AuthRegisterRequestDto = z.infer<typeof AuthRegisterRequestSchema>;
export type AuthRegisterResponseDto = z.infer<typeof AuthRegisterResponseSchema>;
export type AuthLoginRequestDto = z.infer<typeof AuthLoginRequestSchema>;
export type AuthLoginResponseDto = z.infer<typeof AuthLoginResponseSchema>;
export type AuthRefreshRequestDto = z.infer<typeof AuthRefreshRequestSchema>;
export type AuthRefreshResponseDto = z.infer<typeof AuthRefreshResponseSchema>;
export type AuthLogoutRequestDto = z.infer<typeof AuthLogoutRequestSchema>;
export type AuthLogoutResponseDto = z.infer<typeof AuthLogoutResponseSchema>;
export type AuthMeResponseDto = z.infer<typeof AuthMeResponseSchema>;
export type UsersMeResponseDto = z.infer<typeof UsersMeResponseSchema>;
export type CreditsBalanceResponseDto = z.infer<typeof CreditsBalanceResponseSchema>;
export type CreditsTransactionsResponseDto = z.infer<typeof CreditsTransactionsResponseSchema>;
export type CreateProjectRequestDto = z.infer<typeof CreateProjectRequestSchema>;
export type CreateProjectResponseDto = z.infer<typeof CreateProjectResponseSchema>;
export type ListProjectsResponseDto = z.infer<typeof ListProjectsResponseSchema>;
export type GetProjectResponseDto = z.infer<typeof GetProjectResponseSchema>;
export type UpdateProjectRequestDto = z.infer<typeof UpdateProjectRequestSchema>;
export type UpdateProjectResponseDto = z.infer<typeof UpdateProjectResponseSchema>;
export type DeleteProjectResponseDto = z.infer<typeof DeleteProjectResponseSchema>;
export type GenerateScriptRequestDto = z.infer<typeof GenerateScriptRequestSchema>;
export type GenerateScriptResponseDto = z.infer<typeof GenerateScriptResponseSchema>;
export type SplitScenesRequestDto = z.infer<typeof SplitScenesRequestSchema>;
export type SplitScenesResponseDto = z.infer<typeof SplitScenesResponseSchema>;
export type ListTemplatesResponseDto = z.infer<typeof ListTemplatesResponseSchema>;
export type CreateRenderRequestDto = z.infer<typeof CreateRenderRequestSchema>;
export type CreateRenderResponseDto = z.infer<typeof CreateRenderResponseSchema>;
export type GetRenderResponseDto = z.infer<typeof GetRenderResponseSchema>;
export type ListRendersResponseDto = z.infer<typeof ListRendersResponseSchema>;
export type CancelRenderResponseDto = z.infer<typeof CancelRenderResponseSchema>;
export type BillingPlansResponseDto = z.infer<typeof BillingPlansResponseSchema>;
export type CheckoutSessionRequestDto = z.infer<typeof CheckoutSessionRequestSchema>;
export type CheckoutSessionResponseDto = z.infer<typeof CheckoutSessionResponseSchema>;
export type PortalSessionResponseDto = z.infer<typeof PortalSessionResponseSchema>;
export type BillingSubscriptionResponseDto = z.infer<typeof BillingSubscriptionResponseSchema>;
export type StripeWebhookRequestDto = z.infer<typeof StripeWebhookRequestSchema>;
export type StripeWebhookResponseDto = z.infer<typeof StripeWebhookResponseSchema>;
export type InternalRenderTickResponseDto = z.infer<typeof InternalRenderTickResponseSchema>;
export type InternalGrantMonthlyResponseDto = z.infer<typeof InternalGrantMonthlyResponseSchema>;
