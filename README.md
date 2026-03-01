# AI Motivational Shorts Monorepo

Baseline MVP monorepo scaffold for:

- `apps/web` — Next.js dashboard/frontend shell
- `apps/api` — Express + TypeScript backend shell
- `apps/renderer` — Remotion rendering shell
- `packages/shared-types` — shared Zod schemas and DTOs
- `packages/eslint-config` and `packages/tsconfig` — shared configs

## Quick start

1. Enable corepack and install dependencies.
2. Copy `.env.example` to `.env` as needed.
3. Run:

```bash
pnpm install
pnpm dev
```

## Workspace scripts

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
