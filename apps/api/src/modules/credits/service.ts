import { CreditsBalanceResponseSchema, CreditsTransactionsResponseSchema, CursorQuerySchema } from '@shorts/shared-types';
import { z } from 'zod';

type CursorQueryDto = z.infer<typeof CursorQuerySchema>;

export const creditsService = {
  balance: () => CreditsBalanceResponseSchema.parse({ balance: 100 }),
  transactions: (_query: CursorQueryDto) => CreditsTransactionsResponseSchema.parse({
    items: [{ id: 'tx_1', amount: 100, reason: 'signup_bonus', createdAt: new Date().toISOString() }],
    nextCursor: null
  })
};
