import { CreditsBalanceResponseSchema, CreditsTransactionsResponseSchema, CursorQuerySchema } from '@shorts/shared-types';
import { z } from 'zod';

import { db } from '../../db';
import { refundRenderCredits } from '../../db/render-jobs';

type CursorQueryDto = z.infer<typeof CursorQuerySchema>;

export const creditsService = {
  balance: () => CreditsBalanceResponseSchema.parse({ balance: 100 }),
  transactions: (_query: CursorQueryDto) => CreditsTransactionsResponseSchema.parse({
    items: [{ id: 'tx_1', amount: 100, reason: 'signup_bonus', createdAt: new Date().toISOString() }],
    nextCursor: null
  }),
  async refundRenderForPlatformFailure(input: {
    jobId: string;
    userId: string;
    amount: number;
    reason: string;
  }) {
    const job = await db.renderJob.findFirst({
      where: {
        id: input.jobId,
        userId: input.userId,
      },
      select: { id: true },
    });

    if (!job) {
      throw new Error('Render job not found for refund');
    }

    return refundRenderCredits(input);
  },
};
