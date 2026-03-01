import {
  BillingPlansResponseSchema,
  BillingSubscriptionResponseSchema,
  CheckoutSessionResponseSchema,
  PortalSessionResponseSchema,
  type CheckoutSessionRequestDto
} from '@shorts/shared-types';

export const billingService = {
  plans: () => BillingPlansResponseSchema.parse({ items: [{ id: 'plan_pro', name: 'Pro', monthlyCredits: 1000 }] }),
  checkoutSession: (_payload: CheckoutSessionRequestDto) => CheckoutSessionResponseSchema.parse({ url: 'https://example.com/checkout' }),
  portalSession: () => PortalSessionResponseSchema.parse({ url: 'https://example.com/portal' }),
  subscription: () => BillingSubscriptionResponseSchema.parse({ status: 'inactive', planId: null })
};
