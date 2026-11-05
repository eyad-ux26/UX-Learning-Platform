# Hosting on Cloudflare Workers

The web app runs on Cloudflare Workers through the OpenNext adapter. Vercel is no longer configured in the repo (`vercel.json` is gone); the Vercel project is removed after the re-test.

## What is in the repo
- `apps/web/wrangler.jsonc`: Worker name `uxgate-web`, placement near Frankfurt, daily Cron Trigger at 02:00 UTC, `UG_HTTPS=1`.
- `apps/web/cf-worker.ts`, `apps/web/open-next.config.ts`: the Worker entry and the OpenNext config.
- `apps/web/app/api/cron/daily/route.ts`: the job the Cron Trigger calls, closed with `CRON_SECRET`.
- `npm run cf:build -w @uxgate/web` builds the Worker; `npm run cf:preview -w @uxgate/web` runs it locally.
- Security headers, including HSTS (one year, this host only), come from `apps/web/next.config.ts`.
- Cloudflare Web Analytics: set `NEXT_PUBLIC_CF_BEACON_TOKEN` at build time. Without it no analytics script loads.

## Workers Builds settings (dashboard, one time)
Workers & Pages, Create, Import a repository, pick `UX-Learning-Platform`.
- Worker name: `uxgate-web` (must match `wrangler.jsonc`). Production branch: `main`. Root directory: `/`.
- Build command: `npm ci && npm run cf:build -w @uxgate/web`
- Deploy command: `cd apps/web && npx wrangler deploy`
- Non-production branch deploy command: `cd apps/web && npx wrangler versions upload --var BILLING_MOCK:1` (gives each branch a preview URL, with the test payment page on). `BILLING_MOCK` must never be in `wrangler.jsonc` or the Worker's own variables: those reach production too. Previews share production's Supabase project, so test-mode Pro is stored as `source = 'mock'` and production never counts it, never shows the test payment page and never renews it.
- Build variables: `NODE_VERSION` = `22`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, later `NEXT_PUBLIC_CF_BEACON_TOKEN`.
- Worker settings, Variables and Secrets (type Secret): `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`. Never put these in the repo or in chat.

## Status
Workers Builds is connected to this repository on the UXGate Cloudflare account (worker `uxgate-web`). Branch builds use `wrangler versions upload`, so every branch gets its own preview URL; `main` builds on the production deploy command. Supabase accepts the worker URL and `*-uxgate-web.uxgate-web.workers.dev` as redirect targets.
