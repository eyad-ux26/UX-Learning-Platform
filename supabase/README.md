# Supabase setup (staging and production)

The database lives in `migrations/`. The sign-in emails live in `templates/`. Nothing here holds a secret.

## 1. Create the project
1. New Supabase project named `uxgate-staging` (later `uxgate-production`). **Region: Frankfurt (eu-central-1).** There is no Middle East region, Frankfurt is the closest, and the region cannot be changed after creation.
2. In the SQL editor, run `migrations/0001_core_loop.sql`, then `migrations/0002_current_path.sql`, then `migrations/0003_server_guards.sql`, then `migrations/0004_replays.sql`, then `migrations/0005_email_locale.sql`, then (slice 2) `migrations/0006_banks.sql`, `migrations/0007_mastery_and_review.sql` and `migrations/0008_lesson_progress_summary.sql`, then `seed/content.sql` (all are paste-ready; the seed is generated from the compiled lessons and is safe to run again). No service key is needed for either.
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

## 7. Slice 2 migrations (0006, 0007, 0008)
Run in the SQL editor, in this order, after 0001 to 0005. Each runs once and is safe to read before running.
1. Paste `migrations/0006_banks.sql`. It lets a lesson row have `mode = 'bank'` (the mastery question banks).
2. Paste `migrations/0007_mastery_and_review.sql`. It adds `attempts.plan`, allows the `missed` outcome in `xp_events`, and creates the `review_requests` table with row-level security.
3. Check: `select column_name from information_schema.columns where table_name = 'attempts' and column_name = 'plan';` returns one row.
4. Paste `migrations/0008_lesson_progress_summary.sql`. It adds `my_lesson_progress()`, which sums a learner's progress per lesson inside the database, so pages no longer download the whole history (and an index for it). It changes no data; the app works before it too, only slower.
5. Check: `select proname from pg_proc where proname = 'my_lesson_progress';` returns one row.
Slice 3 migrations start at 0016 and run after these.

## 8. Reseed the content (after 0006 and 0007)
1. Paste `seed/content.sql` into the SQL editor and run it. It is safe to run again; it adds all P01 and P10 units and their B01 banks.
2. Check: `select count(*) from lessons where mode = 'bank';` returns 11 (5 P01 units + 6 P10 units).
3. After any lesson change, run `npm run seed:sql`, commit the file and run it again.

## 9. Bunny Stream (video steps)
1. In Bunny, create a Stream library and note its CDN hostname (looks like `vz-xxxxxxxx-xxx.b-cdn.net`).
2. Library > Security: turn on **Token Authentication** and copy the token authentication key. Optionally restrict allowed referrers to the app domain.
3. Vercel env, for Preview and Production: `BUNNY_STREAM_CDN_HOST` = the hostname, `BUNNY_STREAM_TOKEN_KEY` = the key. Server only; never put the key in chat, git or a `NEXT_PUBLIC_` variable.
4. Redeploy. Without these two values, video steps show a "video unavailable" state and the lesson still continues.
5. Check: open `/en/try/video` (plays the bundled test clip) and then a real lesson with a video step. The step ids in the content (`video:`) are the Bunny video ids. Signing against a real library has not been tested yet.
