import { InternalGrantMonthlyResponseSchema, InternalRenderTickResponseSchema } from '@shorts/shared-types';
import { processRenderQueueBatch } from '../../queue/worker';

export const internalService = {
  async renderTick() {
    const result = await processRenderQueueBatch();
    return InternalRenderTickResponseSchema.parse({ triggered: result.processed > 0 });
  },
  grantMonthly: () => InternalGrantMonthlyResponseSchema.parse({ processed: 0 }),
};
