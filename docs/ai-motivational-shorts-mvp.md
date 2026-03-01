# AI Motivational Shorts Generator (MVP) — Production-Safe Blueprint

## 1) Clean production-ready folder structure

```txt
ai-motivational-shorts/
├─ apps/
│  ├─ web/                                # Next.js (recommended for auth + dashboard UX)
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ (marketing)/
│  │  │  │  ├─ (auth)/login
│  │  │  │  ├─ (auth)/register
│  │  │  │  ├─ dashboard/
│  │  │  │  ├─ projects/[projectId]/
│  │  │  │  ├─ billing/
│  │  │  │  └─ api/health/route.ts       # Optional web-side health endpoint
│  │  │  ├─ components/
│  │  │  ├─ lib/
│  │  │  │  ├─ api-client.ts
│  │  │  │  ├─ auth.ts
│  │  │  │  └─ validators.ts
│  │  │  ├─ hooks/
│  │  │  └─ styles/
│  │  ├─ public/
│  │  └─ package.json
│  │
│  ├─ api/                                # Node.js + Express
│  │  ├─ src/
│  │  │  ├─ config/                       # env, logger, constants
│  │  │  ├─ db/                           # prisma/schema + migrations or knex/sql
│  │  │  ├─ middleware/                   # auth, rate-limit, validation, errors
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ users/
│  │  │  │  ├─ credits/
│  │  │  │  ├─ ai/
│  │  │  │  ├─ scenes/
│  │  │  │  ├─ templates/
│  │  │  │  ├─ renders/
│  │  │  │  ├─ billing/
│  │  │  │  └─ webhooks/
│  │  │  ├─ queue/                        # DB polling workers (no Redis)
│  │  │  ├─ services/
│  │  │  │  ├─ llm.service.ts
│  │  │  │  ├─ remotion.service.ts
│  │  │  │  ├─ storage-r2.service.ts
│  │  │  │  └─ stripe.service.ts
│  │  │  ├─ routes/
│  │  │  ├─ utils/
│  │  │  └─ server.ts
│  │  ├─ package.json
│  │  └─ Dockerfile
│  │
│  └─ renderer/                           # Remotion project for server-side render
│     ├─ src/
│     │  ├─ compositions/
│     │  │  ├─ TemplateOne.tsx
│     │  │  ├─ TemplateTwo.tsx
│     │  │  └─ TemplateThree.tsx
│     │  ├─ components/
│     │  ├─ hooks/
│     │  ├─ utils/
│     │  ├─ watermark/
│     │  └─ index.ts
│     ├─ remotion.config.ts
│     ├─ package.json
│     └─ Dockerfile
│
├─ packages/
│  ├─ shared-types/                       # zod schemas + shared DTOs
│  ├─ eslint-config/
│  └─ tsconfig/
│
├─ infrastructure/
│  ├─ docker/
│  ├─ terraform/                          # optional later
│  └─ sql/
│
├─ .env.example
├─ docker-compose.yml
├─ pnpm-workspace.yaml
└─ README.md
```

**Why this is MVP-safe**
- Keeps render workload isolated from API request latency.
- Keeps queue worker logic in API app initially (fewer moving parts), but separable later.
- Enables monorepo type sharing to reduce frontend/backend contract drift.

---

## 2) Database schema (PostgreSQL)

Use UUID primary keys, `timestamptz`, and explicit statuses via enums.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE subscription_status AS ENUM (
  'inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
);

CREATE TYPE render_job_status AS ENUM (
  'queued', 'processing', 'succeeded', 'failed', 'canceled'
);

CREATE TYPE credit_txn_type AS ENUM (
  'grant_monthly', 'grant_bonus', 'deduct_render', 'refund_render', 'admin_adjust'
);

-- Users & Auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Billing
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,                 -- free, starter, pro
  name TEXT NOT NULL,
  monthly_credits INT NOT NULL,
  stripe_price_id TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status subscription_status NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credits (ledger-first)
CREATE TABLE credit_accounts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type credit_txn_type NOT NULL,
  amount INT NOT NULL,                       -- positive grant, negative deduction
  balance_after INT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);

-- Projects & Scripts
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  target_duration_sec INT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_user_id_created ON projects(user_id, created_at DESC);

CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_prompt TEXT,
  full_text TEXT NOT NULL,
  model_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_index INT NOT NULL,
  text_content TEXT NOT NULL,
  duration_sec NUMERIC(6,2) NOT NULL,
  visual_prompt TEXT,
  UNIQUE(project_id, scene_index)
);

-- Rendering
CREATE TABLE render_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,                 -- template_1, template_2, template_3
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES render_templates(id),
  status render_job_status NOT NULL DEFAULT 'queued',
  progress INT NOT NULL DEFAULT 0,
  error_message TEXT,
  is_watermarked BOOLEAN NOT NULL DEFAULT true,
  output_url TEXT,
  output_storage_key TEXT,
  requested_credits INT NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_render_jobs_status_created ON render_jobs(status, created_at);
CREATE INDEX idx_render_jobs_user_created ON render_jobs(user_id, created_at DESC);

-- Optional: idempotency for create-render endpoint
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  response_code INT,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
```

---

## 3) API route structure

Version all APIs (`/v1`) and keep modules isolated.

### Auth
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

### User / Credits
- `GET /v1/users/me`
- `GET /v1/credits/balance`
- `GET /v1/credits/transactions?cursor=...`

### AI + Project building
- `POST /v1/projects` (create draft)
- `GET /v1/projects`
- `GET /v1/projects/:id`
- `PATCH /v1/projects/:id`
- `DELETE /v1/projects/:id`
- `POST /v1/projects/:id/generate-script`
- `POST /v1/projects/:id/split-scenes`

### Rendering
- `GET /v1/templates`
- `POST /v1/renders` (enqueue render job)
- `GET /v1/renders/:jobId`
- `GET /v1/renders` (list user jobs)
- `POST /v1/renders/:jobId/cancel`

### Billing (user initiated)
- `GET /v1/billing/plans`
- `POST /v1/billing/checkout-session`
- `POST /v1/billing/portal-session`
- `GET /v1/billing/subscription`

### Webhooks (public but signed)
- `POST /v1/webhooks/stripe`

### Admin/Internal (protect by role + secret)
- `POST /v1/internal/queue/render-tick` (optional cron trigger)
- `POST /v1/internal/credits/grant-monthly`

---

## 4) High-level rendering workflow

1. User finalizes script/scenes and chooses one of 3 templates.
2. API validates ownership, project completeness, and template availability.
3. API computes required credits and attempts atomic credit reservation/deduction.
4. API inserts `render_jobs` row with `queued` status.
5. Worker process polls DB:
   - `SELECT ... FOR UPDATE SKIP LOCKED` on queued rows.
   - Set job `processing`, `started_at`.
6. Worker builds Remotion input payload:
   - scene text/timings
   - template params
   - watermark flag (true for free-tier/inactive subscription)
7. Worker calls Remotion render in renderer container/process.
8. On success:
   - Upload MP4 to Cloudflare R2.
   - Update `render_jobs` (`succeeded`, `output_url`, `finished_at`, `progress=100`).
9. On failure:
   - Update `render_jobs` to `failed` with error message.
   - Optionally refund credits based on policy.
10. Frontend polls job status or uses SSE/websocket later.

**Worker query pattern (important):**
- `FOR UPDATE SKIP LOCKED` prevents two workers from taking the same job.
- Keep small batch size (e.g., 3-10 jobs/worker) in MVP.

---

## 5) Credit deduction flow

Use a **ledger + balance** model with DB transaction boundaries.

### On render enqueue
Within a single DB transaction:
1. Lock user credit row:
   - `SELECT balance FROM credit_accounts WHERE user_id = $1 FOR UPDATE`
2. Validate `balance >= render_cost`.
3. Update balance: `balance = balance - render_cost`.
4. Insert `credit_transactions` with `type='deduct_render'`, `amount=-render_cost`, `metadata={jobId/projectId}`.
5. Insert `render_jobs` row as `queued`.
6. Commit.

If any step fails, rollback entire transaction.

### On render failure (refund policy)
- If failure is platform-side (render crash, infra outage), refund:
  - lock credit row
  - increment balance
  - insert `refund_render` transaction referencing job ID.
- If failure is user content validation error caught pre-render, do not deduct in first place.

### Monthly credits
- Stripe webhook or scheduled job grants monthly credits:
  - Insert `grant_monthly` transaction.
  - Update balance atomically.

---

## 6) Stripe subscription sync logic

Use Stripe as source of truth for billing lifecycle, your DB as app-state projection.

### Setup
- Create products/prices in Stripe dashboard.
- Store `stripe_price_id` in `plans` table.
- On checkout session creation, attach `user_id` in metadata.

### Webhook events to handle
At minimum:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

### Idempotent webhook processor
1. Verify Stripe signature header.
2. Insert event into `stripe_events` using unique `stripe_event_id`.
   - If conflict, return 200 immediately (already processed).
3. Start DB transaction.
4. Map Stripe customer/subscription to internal user/subscription row.
5. Update `subscriptions.status`, `current_period_start/end`, `plan_id`, `cancel_at_period_end`.
6. On `invoice.paid` for subscription renewal, grant monthly credits once per billing period.
   - Use metadata or period key in transaction metadata to prevent duplicate grant.
7. Mark `stripe_events.processed_at` and commit.

### Downgrade and cancellation behavior (MVP)
- Keep existing balance untouched.
- Stop new monthly grants after cancellation/end.
- Watermark turns on when subscription not active/trialing.

---

## 7) Security best practices (MVP but production-safe)

### Auth & session security
- Hash passwords with Argon2id or bcrypt (strong cost factor).
- Short-lived JWT access token (e.g., 15 min) + rotating refresh tokens.
- Store refresh tokens hashed in DB.
- Revoke refresh token on logout/password reset.

### API hardening
- Validate all request payloads with Zod/Joi.
- Enforce strict authZ ownership checks on every project/render route.
- Rate limit sensitive endpoints (login, generate-script, render enqueue, webhook).
- Use idempotency keys for render enqueue and checkout session endpoints.

### Stripe + webhook security
- Verify webhook signatures with Stripe signing secret.
- Never trust client-sent plan/price/credit values.
- Derive entitlements from DB subscription state synced by webhook.

### Data & infra security
- Use least-privilege DB user roles.
- Enable TLS everywhere (frontend, API, DB connection where supported).
- Encrypt secrets via platform secret manager (not `.env` in production).
- Use structured logging with PII redaction.
- Add audit log entries for credits and billing state changes.

### Storage security (R2)
- Keep bucket private.
- Serve media via signed URLs with expiry.
- Validate file paths/object keys to prevent traversal-like issues.

### Remotion/render safety
- Sanitize user text before passing into templates.
- Timeouts and memory limits for render workers.
- Concurrency caps to prevent noisy-neighbor abuse.

---

## MVP implementation priorities (suggested order)

1. Auth + users + plans/subscriptions schema.
2. Credits ledger + basic project CRUD.
3. AI script generation + scene splitting endpoint.
4. Render queue with one worker + Remotion integration.
5. R2 upload + signed URL delivery.
6. Stripe checkout + webhook sync + monthly credit grants.
7. Hardening: rate limiting, idempotency, observability, retry policies.

This gives you a deployable MVP that is simple operationally, but avoids common production pitfalls (double-charging credits, duplicate webhooks, and non-idempotent rendering).
