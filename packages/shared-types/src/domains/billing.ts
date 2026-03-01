import { z } from 'zod';

export const BillingPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  monthlyCredits: z.number().int()
});

export const BillingSubscriptionSummarySchema = z.object({
  status: z.string(),
  planId: z.string().nullable()
});

export const BillingPlansResponseSchema = z.object({ items: z.array(BillingPlanSchema) });
export const CheckoutSessionRequestSchema = z.object({ planId: z.string() });
export const CheckoutSessionResponseSchema = z.object({ url: z.string().url() });
export const PortalSessionResponseSchema = z.object({ url: z.string().url() });

export type BillingPlanDto = z.infer<typeof BillingPlanSchema>;
export type BillingSubscriptionSummaryDto = z.infer<typeof BillingSubscriptionSummarySchema>;
export type BillingPlansResponseDto = z.infer<typeof BillingPlansResponseSchema>;
export type CheckoutSessionRequestDto = z.infer<typeof CheckoutSessionRequestSchema>;
export type CheckoutSessionResponseDto = z.infer<typeof CheckoutSessionResponseSchema>;
export type PortalSessionResponseDto = z.infer<typeof PortalSessionResponseSchema>;
