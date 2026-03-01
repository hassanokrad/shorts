import { z } from 'zod';

export const UsersMeResponseSchema = z.object({ userId: z.string(), email: z.string().email(), name: z.string().nullable() });

export const CreditsBalanceResponseSchema = z.object({ balance: z.number().int().nonnegative() });
export const CreditsTransactionSchema = z.object({ id: z.string(), amount: z.number().int(), reason: z.string(), createdAt: z.string() });
export const CreditsTransactionsResponseSchema = z.object({ items: z.array(CreditsTransactionSchema), nextCursor: z.string().nullable() });

export const TemplateSchema = z.object({ id: z.string(), name: z.string(), description: z.string().nullable() });
export const ListTemplatesResponseSchema = z.object({ items: z.array(TemplateSchema) });

export const StripeWebhookRequestSchema = z.object({ type: z.string(), data: z.unknown() });
export const StripeWebhookResponseSchema = z.object({ received: z.boolean() });

export const InternalRenderTickResponseSchema = z.object({ triggered: z.boolean() });
export const InternalGrantMonthlyResponseSchema = z.object({ processed: z.number().int().nonnegative() });

export type UsersMeResponseDto = z.infer<typeof UsersMeResponseSchema>;
export type CreditsBalanceResponseDto = z.infer<typeof CreditsBalanceResponseSchema>;
export type CreditsTransactionsResponseDto = z.infer<typeof CreditsTransactionsResponseSchema>;
export type ListTemplatesResponseDto = z.infer<typeof ListTemplatesResponseSchema>;
export type StripeWebhookRequestDto = z.infer<typeof StripeWebhookRequestSchema>;
export type StripeWebhookResponseDto = z.infer<typeof StripeWebhookResponseSchema>;
export type InternalRenderTickResponseDto = z.infer<typeof InternalRenderTickResponseSchema>;
export type InternalGrantMonthlyResponseDto = z.infer<typeof InternalGrantMonthlyResponseSchema>;
