# Supabase setup (staging and production)

The database lives in `migrations/`. The sign-in emails live in `templates/`. Nothing here holds a secret.

## 1. Create the project
1. New Supabase project named `uxgate-staging` (later `uxgate-production`). **Region: Frankfurt (eu-central-1).** There is no Middle East region, Frankfurt is the closest, and the region cannot be changed after creation.
2. In the SQL editor, run `migrations/0001_core_loop.sql`, then `migrations/0002_current_path.sql`, then `migrations/0003_server_guards.sql`, then `migrations/0004_replays.sql`, then `migrations/0005_email_locale.sql`, then `seed/content.sql` (all are paste-ready; the seed is generated from the compiled lessons and is safe to run again). No service key is needed for either.
3. Regenerate the content file after any lesson change with `npm run seed:sql` and commit it. The tests fail if it is stale.

## 2. Where each key goes
| Value | Where |
| --- | --- |
| Project URL | Cloudflare build variable `NEXT_PUBLIC_SUPABASE_URL` |
| anon (public) key | Cloudflare build variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key | Cloudflare Worker secret `SUPABASE_SERVICE_ROLE_KEY` only. Never in chat, git or the browser. |

## 3. Authentication settings (Authentication > Sign In / Providers)
- Email: on, "Confirm email" on, password minimum length 8.
- Google: on. Client ID and secret from the Google Cloud OAuth client. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
- Authentication > URL Configuration:
  - Site URL: `https://uxgate.org` (production) or the staging URL.
  - Redirect URLs: `https://uxgate.org/api/auth/callback`, `https://*-uxgate-web.uxgate-web.workers.dev/api/auth/callback`, `http://localhost:3000/api/auth/callback`.

## 4. Emails in the learner's language
- Authentication > SMTP: Resend. Host `smtp.resend.com`, port 465, user `resend`, password = the Resend API key (kept in Supabase only). Sender `UXGate <no-reply@uxgate.org>`. The domain `uxgate.org` must be verified in Resend (SPF, DKIM records).
- Authentication > Emails: paste `templates/confirmation.html` into "Confirm signup" and `templates/magic_link.html` into "Magic link". They switch on `.Data.locale`, which the app sets at sign-up and sign-in (`en` or `ar`).
- Subjects: set both in English and Arabic, e.g. `Confirm your email · أكّد بريدك الإلكتروني`.

## 5. Hosting and GitHub settings
- Hosting is Cloudflare Workers; setup, build variables and secrets are in `docs/deploy-cloudflare.md`. The Worker is placed near Frankfurt (`placement` in `apps/web/wrangler.jsonc`) so server code sits next to the database.
- Cloudflare billing: the free plan has a very small CPU limit per request; move to Workers Paid and set usage alerts before real learners arrive.
- Web analytics: Cloudflare Web Analytics, enabled by setting `NEXT_PUBLIC_CF_BEACON_TOKEN` at build time.
- GitHub: Settings > Code security: turn on **Dependabot alerts** and **Dependabot security updates**. Keep Next.js on a patched release. `.github/dependabot.yml` adds weekly version updates (next-intl is held below 4.5 until issue #104 is solved).

## 6. Check
`npm run test -w @uxgate/db` runs the row-level security tests with no Docker.
