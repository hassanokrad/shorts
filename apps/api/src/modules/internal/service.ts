import { InternalGrantMonthlyResponseSchema, InternalRenderTickResponseSchema } from '@shorts/shared-types';

export const internalService = {
  renderTick: () => InternalRenderTickResponseSchema.parse({ triggered: true }),
  grantMonthly: () => InternalGrantMonthlyResponseSchema.parse({ processed: 0 })
};
