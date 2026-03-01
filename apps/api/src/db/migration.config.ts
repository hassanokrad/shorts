import path from 'node:path';

export const migrationConfig = {
  migrationsDir: path.resolve(__dirname, 'migrations'),
  migrationsTable: 'schema_migrations',
};
