# AI Motivational Shorts Monorepo

This repository is a pnpm workspace for a three-service MVP that generates and serves AI motivational shorts.

## MVP architecture

- `apps/api` (`@shorts/api`): Express + TypeScript backend for orchestration, persistence, and API endpoints.
- `apps/renderer` (`@shorts/renderer`): Remotion-based video renderer.
- `apps/web` (`@shorts/web`): Next.js frontend/dashboard.
- `packages/shared-types` (`@shorts/shared-types`): shared schemas/types consumed by API and web.
- `packages/eslint-config` (`@shorts/eslint-config`): shared ESLint presets.
- `packages/tsconfig` (`@shorts/tsconfig`): shared TypeScript config presets.
- `infrastructure/docker`: docker-related infra artifacts.
- `infrastructure/sql`: SQL bootstrap/migration helpers.

## Workspace setup

```bash
pnpm install
cp .env.example .env
```

## Startup order (development)

Start services in this order so downstream dependencies are available:

1. **API** (`apps/api`) — base backend endpoints should be reachable first.
2. **Renderer** (`apps/renderer`) — renderer worker/studio process can then connect to API.
3. **Web** (`apps/web`) — frontend starts last so it can call live API endpoints.

Manual startup:

```bash
pnpm --filter @shorts/api dev
pnpm --filter @shorts/renderer dev
pnpm --filter @shorts/web dev
```

Or run all workspace scripts:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
```
