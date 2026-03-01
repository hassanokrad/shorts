# Database setup

This project uses **SQL-file migrations** stored in `src/db/migrations`.

## Commands

- `pnpm --filter @shorts/api db:migrate` applies SQL migrations in filename order.
- `pnpm --filter @shorts/api db:seed` seeds plans and render templates.

Migrations are tracked in the `schema_migrations` table.
