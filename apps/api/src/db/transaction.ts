import { Prisma, PrismaClient } from '@prisma/client';
import { db } from './client';

type DbExecutor = PrismaClient | Prisma.TransactionClient;

export async function withDbTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  client: DbExecutor = db,
): Promise<T> {
  if ('$transaction' in client) {
    return client.$transaction((tx) => fn(tx));
  }

  return fn(client);
}
