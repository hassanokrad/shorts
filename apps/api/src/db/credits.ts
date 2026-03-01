import { CreditTxnType, Prisma } from '@prisma/client';
import { db } from './client';
import { withDbTransaction } from './transaction';

export class InsufficientCreditsError extends Error {
  constructor(message = 'Insufficient credits') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

export type CreditTransactionInput = {
  userId: string;
  type: CreditTxnType;
  amount: number;
  metadata?: Prisma.JsonObject;
};

export async function applyCreditTransaction(
  input: CreditTransactionInput,
  tx?: Prisma.TransactionClient,
) {
  const executor = tx ?? db;

  return withDbTransaction(async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO credit_accounts (user_id, balance, updated_at)
      VALUES (${input.userId}::uuid, 0, now())
      ON CONFLICT (user_id) DO NOTHING
    `;

    const [account] = await transaction.$queryRaw<Array<{ balance: number }>>`
      SELECT balance
      FROM credit_accounts
      WHERE user_id = ${input.userId}::uuid
      FOR UPDATE
    `;

    if (!account) {
      throw new Error('Failed to load credit account row');
    }

    const nextBalance = account.balance + input.amount;
    if (nextBalance < 0) {
      throw new InsufficientCreditsError();
    }

    await transaction.creditAccount.update({
      where: { userId: input.userId },
      data: {
        balance: nextBalance,
        updatedAt: new Date(),
      },
    });

    return transaction.creditTransaction.create({
      data: {
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        balanceAfter: nextBalance,
        metadata: input.metadata ?? {},
      },
    });
  }, executor);
}
