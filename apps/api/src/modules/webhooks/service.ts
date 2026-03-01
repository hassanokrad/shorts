import { StripeWebhookResponseSchema, type StripeWebhookRequestDto } from '@shorts/shared-types';

export const webhooksService = {
  stripe: (_payload: StripeWebhookRequestDto) => StripeWebhookResponseSchema.parse({ received: true })
};
