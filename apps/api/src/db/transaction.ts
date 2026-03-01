import { Prisma, PrismaClient } from '@prisma/client';
import { db } from './client';

type DbExecutor = PrismaClient | Prisma.TransactionClient;

export async function withDbTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  executor: DbExecutor = db,
): Promise<T> {
  if (executor instanceof PrismaClient) {
    return executor.$transaction((tx) => fn(tx));
  }

  return fn(executor);
}
