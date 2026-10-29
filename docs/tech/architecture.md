# Architecture

Version 1, 29 October 2026. Stack approved on 29 October 2026; payment providers are a working assumption (Paymob for Egypt, Paddle elsewhere).

## Overview

```
                         uxgate.org (Vercel)
 ┌──────────────────────────────────────────────────────────────────┐
 │ Next.js app (App Router, TypeScript)                             │
 │  /[locale]/...      public site, guest lesson     (SSG + ISR)    │
 │  /[locale]/app/...  learner app                    (client + RSC) │
 │  /admin/...         admin panel                    (RSC, server)  │
 │  /api/webhooks/*    Paymob, Paddle, Bunny, Resend  (route handlers)│
 │  /api/cron/*        reminders, review queue, cleanup (Vercel Cron) │
 └───────┬───────────────────────┬───────────────────┬──────────────┘
         │ supabase-js (RLS)     │ server only       │ signed URLs
 ┌───────▼───────────┐   ┌───────▼────────┐   ┌──────▼───────────┐
 │ Supabase          │   │ Resend (email) │   │ Bunny Stream     │
 │ Postgres + Auth   │   │ Paymob, Paddle │   │ video + captions │
 │ Storage (images)  │   │ Web Push (VAPID)│  └──────────────────┘
 └───────────────────┘   └────────────────┘
         ▲
         │ content publish (CI)
 ┌───────┴──────────────────────────────────────────────┐
 │ GitHub repo: content/paths/*.yaml → validate → compile│
 └──────────────────────────────────────────────────────┘
```

## Repository layout (target)

The repo becomes a small npm workspace. Content and its tooling stay where they are.

```
apps/web/                Next.js app (learner, public site, admin)
  app/[locale]/          public pages and learner app, locale = en | ar
  app/admin/             admin panel
  app/api/               webhooks and cron
  components/            UI built on the design tokens
  lib/                   supabase clients, billing, email, i18n
packages/player/         lesson player: step renderers and the attempt state machine
packages/content/        loader, validator, compiler (moved from scripts/lib)
packages/tokens/         design tokens from Claude Design → CSS variables + TS
content/paths/           YAML content (unchanged)
supabase/migrations/     SQL migrations, RLS policies, seed
preview/                 review player for content PRs (kept, reuses packages/player later)
docs/                    this documentation
```

## Key decisions

### Rendering and i18n

- Locale is the first URL segment (`/en`, `/ar`). `<html lang dir>` is set per locale on the server, so RTL is correct on first paint.
- Styling uses CSS logical properties only (`margin-inline-start`, never `margin-left`). A lint rule blocks physical properties in `apps/web`.
- Interface strings live in `apps/web/messages/{en,ar}.json` with `next-intl`. Missing keys fail CI.
- Public pages are statically generated and revalidated when content is published. The learner app and admin are dynamic.

### Theme

- Tokens are defined once in `packages/tokens` (from the Claude Design system) and emitted as CSS variables for `light` and `dark`. The theme follows the system until the learner picks one; the choice is stored on the profile and in a cookie to avoid a flash.
- Tailwind CSS reads the variables, so components never use raw colours.

### Content pipeline

1. Authors change YAML in a PR. CI runs `npm run validate` and builds the preview.
2. On merge to `main`, CI compiles every path to JSON (`packages/content` compiler) and writes one row per lesson into `content_versions` through a service-role script. Each lesson's JSON is hashed; an unchanged hash creates no new version.
3. The app reads published lesson JSON from Postgres (cached with Next.js `unstable_cache`, tagged per lesson, revalidated on publish).
4. Attempts store `content_version_id`, so an old attempt always replays against the content it was played on.
5. When the admin content editor arrives, it writes the same JSON shape and runs the same validator in a server action. YAML in the repo remains the backup and review format until admins decide to move fully to the panel.

### Lesson player and saving work

- `packages/player` is a pure TypeScript state machine (step → selecting → checked → revising → done) with React renderers per step type. It is ported from `preview/player.html`.
- Every committed answer is written to IndexedDB first, then sent to `POST /api/attempts` in order, with retries and an idempotency key (`attempt_id + step_id + try`). The server ignores duplicates.
- Guests use the same queue; on sign-up the queued attempts are claimed by the new account.
- The server re-checks correctness from the stored content version. The client never decides XP.

### Auth

- Supabase Auth: email and password, magic link, Google, Apple. Auth emails go through Resend SMTP with UXGate templates in both languages.
- `profiles` row created by a trigger on `auth.users`.
- Admin roles are stored in `admin_roles`; every `/admin` request checks the role on the server, and admin writes run with the service role inside server actions that also write `audit_log`.

### Billing

- One interface in `apps/web/lib/billing`: `createCheckout(user, country)`, `cancel(sub)`, `refund(payment)`, `handleWebhook(provider, req)`.
- Provider choice: billing country Egypt → Paymob (card and wallets, EGP); otherwise → Paddle (merchant of record, local currency and tax handled by Paddle).
- Webhooks are verified (Paymob HMAC, Paddle signature), stored raw in `billing_events`, then applied idempotently to `subscriptions` and `payments`. The app only checks `entitlements` (one row per user: `free` or `pro`, with `valid_until`).
- Paymob recurring payments use saved card tokens and a daily cron that charges due renewals; Paddle handles renewals itself.
- Refund rule (7 days) is enforced in the admin action and in the learner self-service refund request.

### Video

- Clips are uploaded to Bunny Stream from the admin media page (or the laptop pipeline via the Bunny API). Captions (.vtt, en and ar) are attached per clip.
- Playback uses Bunny's token-authenticated embed URLs, generated server side and valid for a few hours. Paid lessons only get a token with an entitlement.

### Notifications

- `notifications` table is the in-app inbox. Email through Resend with React Email templates in both languages. Push through the Web Push API with VAPID keys; subscriptions stored per device.
- A Vercel Cron job every 15 minutes sends reminders whose local time has come, using each learner's time zone.

### Feature flags and settings

- `settings` table (key, JSON value) edited in the admin panel: leaderboards, push, video, goal and streak rules, prices. Read through a cached server helper.

### Analytics and reports

- Learning events come from `attempts` and `step_results`, so reports query Postgres directly (materialized views refreshed nightly).
- Page analytics: Vercel Web Analytics (no third-party cookies).
- Errors: Sentry free tier.

## Security checklist (self-review before beta)

- RLS on every table with learner data; tests that one learner cannot read another's rows.
- Service-role key only in server code; `server-only` import guard.
- Webhook signature checks and replay protection.
- Rate limits on sign-in, appeals and attempts (Upstash or Postgres-based).
- Content Security Policy that allows only our origin, Supabase, Bunny, Paymob and Paddle.
- Dependency audit and secret scanning in CI.

## Environments

| Env | Where | Data | Payments |
| --- | --- | --- | --- |
| Local | `npm run dev` + Supabase CLI | Seed | Test keys |
| Preview | Vercel preview per PR | Staging Supabase project | Test mode |
| Production | uxgate.org | Production Supabase project | Live (after beta) |

CI (GitHub Actions): typecheck, lint (including logical-properties rule), unit tests, content validate, axe checks on key pages with Playwright, and the content publish job on `main`.

## Cost estimate (monthly, before payment fees)

| Service | Plan | Cost |
| --- | --- | --- |
| Vercel | Pro | ~$20 |
| Supabase | Free, then Pro | $0 to $25 |
| Bunny Stream | Pay as you go | ~$5 to $10 |
| Resend | Free, then Pro | $0 to $20 |
| Sentry | Developer | $0 |
| Total | | ~$25 to $75 |

Figures are from memory and need checking against current price pages before launch.

See [data-model.md](data-model.md) for tables.
