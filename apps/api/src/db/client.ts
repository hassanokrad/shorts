import { PrismaClient } from '@prisma/client';

let client: PrismaClient | undefined;

export function getDbClient(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
  }

  return client;
}

export const db = getDbClient();
