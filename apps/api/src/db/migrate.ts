import { promises as fs } from 'node:fs';
import path from 'node:path';
import { db } from './client';
import { migrationConfig } from './migration.config';

type Migration = {
  name: string;
  sql: string;
};

async function loadMigrations(): Promise<Migration[]> {
  const files = await fs.readdir(migrationConfig.migrationsDir);

  return Promise.all(
    files
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b))
      .map(async (file) => {
        const filePath = path.join(migrationConfig.migrationsDir, file);
        return {
          name: file,
          sql: await fs.readFile(filePath, 'utf8'),
        };
      }),
  );
}

async function ensureMigrationsTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${migrationConfig.migrationsTable} (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(`
    SELECT id
    FROM ${migrationConfig.migrationsTable}
  `);

  return new Set(rows.map((row) => row.id));
}

async function run() {
  await ensureMigrationsTable();
  const migrations = await loadMigrations();
  const applied = await getAppliedMigrations();

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      continue;
    }

    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(migration.sql);
      await tx.$executeRawUnsafe(
        `INSERT INTO ${migrationConfig.migrationsTable} (id) VALUES ($1)`,
        migration.name,
      );
    });

    console.log(`Applied migration: ${migration.name}`);
  }
}

run()
  .catch((error) => {
    console.error('Migration failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
