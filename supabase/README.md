# Supabase setup (staging and production)

The database lives in `migrations/`. The sign-in emails live in `templates/`. Nothing here holds a secret.

## 1. Create the project
1. New Supabase project named `uxgate-staging` (later `uxgate-production`). **Region: Frankfurt (eu-central-1).** There is no Middle East region, Frankfurt is the closest, and the region cannot be changed after creation.
2. In the SQL editor, run `migrations/0001_core_loop.sql`, then `migrations/0002_current_path.sql`, then `migrations/0003_server_guards.sql`, then `migrations/0004_replays.sql`, then `migrations/0005_email_locale.sql`, then (slice 2) `migrations/0006_banks.sql`, `migrations/0007_mastery_and_review.sql` and `migrations/0008_lesson_progress_summary.sql`, then (slice 3) `migrations/0016_progress_paths.sql`, then (slice 4) `migrations/0026_account_notifications.sql`, then (slice 5) `migrations/0036_billing.sql` (plans, payments, refunds) and `migrations/0037_billing_refused.sql` (refused foreign cards), then `migrations/0038_waitlist.sql` (Coming Soon launch list, `docs/coming-soon.md`), `migrations/0039_learner_state.sql` (faster signed-in pages) and `migrations/0040_waitlist_prune_after_send.sql` (launch list clean-up), then `seed/content.sql` (all are paste-ready; the seed is generated from the compiled lessons and is safe to run again). No service key is needed for either.
   The admin panel adds `migrations/0044_admin_access.sql` to `migrations/0048_admin_hardening.sql`, run in order; `docs/admin/README.md` explains each one and the founding super admin.
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
- Resend: add the domain `uxgate.org` with the return-path subdomain `send` (Resend's default), and add the records it lists in Cloudflare DNS: MX and SPF (TXT) on `send.uxgate.org`, DKIM (TXT) on `resend._domainkey.uxgate.org`. Mail then leaves through `send.uxgate.org`. Every email, from Supabase and from the app, goes out as `UXGate <hello@uxgate.org>`, with reply-to `support@uxgate.org`.
- Authentication > SMTP: Resend. Host `smtp.resend.com`, port 465, user `resend`, password = a Resend API key (kept in Supabase only). Sender email `hello@uxgate.org`, sender name `UXGate`. Supabase has no reply-to field, so the footer of each template asks people to write to `support@uxgate.org`.
- Authentication > Emails: paste `templates/confirmation.html` into "Confirm signup", `templates/magic_link.html` into "Magic link" and `templates/recovery.html` into "Reset password" (the app sends the reset email from the "Forgot password?" page). They switch on `.Data.locale`, which the app sets at sign-up and sign-in (`en` or `ar`). The three are generated from `apps/web/lib/server/email/layout.ts`, so they match the app's own emails.
- Subjects (one per template, so both languages): `Confirm your email · أكّد بريدك الإلكتروني`, `Your UXGate sign-in link · رابط الدخول إلى UXGate`, `Reset your UXGate password · إعادة تعيين كلمة مرور UXGate`.
- Authentication > Emails > settings: keep the email link lifetime ("Email OTP expiration") at 3600 seconds. The emails and the sign-in screens say a link works once, for 1 hour.
- The app's own emails (welcome, daily reminder, badge, account deletion) use the Resend HTTP API with the Worker secret `RESEND_API_KEY`; their one-click "turn off" links are signed with the Worker secret `EMAIL_LINK_SECRET`.

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

## 10. Slice 3 settings (migration 0016, nightly job)

- Run `migrations/0016_progress_paths.sql` (after 0006 to 0008). It is safe to run once; it does not touch lesson content. It also adds `profiles.week_start` (Saturday for Arabic, Monday for English, set at sign-up; existing learners are set once from their current language) and replaces the sign-up trigger so new learners get it.
- `CRON_SECRET`: any long random string, set as a secret where the app runs (see `docs/deploy-cloudflare.md`). The Cloudflare Cron Trigger calls `/api/cron/daily` (02:00 UTC, set in `apps/web/wrangler.jsonc`) with it, and the job refuses anything without it. The job only catches learners who have not opened the app: every Home visit settles that learner's finished days (streak, freezes) by itself.
- The leaderboard is off. To open it for testing, run `update public.app_flags set enabled = true where key = 'leaderboard';` (the admin panel will own this switch later). While it is off, `/app/board` is a 404 and nobody can join.
- The achievement page (`/u/<handle>`) is off for every learner until they turn it on from a certificate or in Settings › Sharing.
- After the nightly job, the same Cron Trigger calls `/api/cron/review-due` (same secret) to send the "skills to review" notice, 25 learners a call. Like the reminders, it needs Workers Paid once there are more than a handful of learners.

## 11. Slice 4: settings, notifications, reminders and deleting an account (0026)

1. In the SQL editor, paste `migrations/0026_account_notifications.sql`. It runs after slice 2 (0007) and slice 3 (0016 onwards) in any order with them. It adds `notification_prefs`, `notifications` (the inbox), `email_log`, `push_subscriptions`, the reply columns on `review_requests`, the delete columns on `profiles` and the `reminder_candidates` function for the reminder job, and a guard so a learner's own session cannot change the delete or welcome columns. Slice 5 starts at 0036.
2. Values to add in Cloudflare (Worker secrets unless marked build variable). Never paste them in chat or git.

| Value | Where | What it does |
| --- | --- | --- |
| `RESEND_API_KEY` | Worker secret | Sends the app's own emails from hello@uxgate.org. Without it, emails are skipped and logged. |
| `EMAIL_LINK_SECRET` | Worker secret, random (`openssl rand -base64 32`) | Signs the one-click "turn off these emails" links. |
| `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY` | Worker secrets (`npx web-push generate-vapid-keys` once) | Signs push messages. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Build variable, same value as `VAPID_PUBLIC_KEY` | Lets the browser subscribe. Without it, the push ask never shows. |
| `NEXT_PUBLIC_SITE_URL` | Build variable | Links in emails. `https://uxgate.org` in production, the staging address on staging. |
| `NEXT_PUBLIC_APPLE_SIGNIN` | Build variable, `1` | Shows Sign in with Apple. Set only after the Apple setup is done. |
| `UG_MAINTENANCE` | Worker variable, `1` | Shows the maintenance page (status 503) on every page. Remove it to end maintenance. |
| `UG_MAINTENANCE_UNTIL` | Worker variable, an ISO time such as `2026-11-20T18:00:00Z` | The "back by" time on the maintenance page, shown in Cairo time. Without it the page says "We'll be back soon". |

3. The reminder cron (`*/15 * * * *` in `wrangler.jsonc`) calls `/api/cron/reminders` with `CRON_SECRET`. It removes accounts whose 30 days have passed, then sends the reminders due in this quarter hour (each learner's own time, never early, at most one a day) in batches of 25. Cloudflare's free plan allows too few subrequests per run, so this needs Workers Paid.
4. Who sends which notification. Each one goes through `notify()` in `apps/web/lib/server/notify.ts`, which writes the inbox item and sends push as the learner's choices allow. The email, where one exists, is sent next to it from `lib/server/email/templates.ts`.

| Kind | Sent by | Status |
| --- | --- | --- |
| reminder, goal | The reminder cron | Done |
| welcome | `sendWelcomeOnce` after onboarding, once per account | Done |
| answer | A database trigger on `review_requests` adds the inbox item when the status leaves `open` | Done. The admin tool that writes answers should also call `notify(…, "answer", …)` for push. |
| badge | A review session that turns skills gold (Kept): `notifyKept` in `lib/server/progress-notify.ts`, one inbox item per badge and one `badgeEmail` per session | Done |
| review | `/api/cron/review-due`, called by the daily Cron Trigger after the nightly job: learners with a skill that came due in the last day, once a day | Done |
| billing | Slice 5 | Slice 5 wires it |

## 12. Give Pro without a payment (admins, QA accounts)

After 0036, run this in the SQL editor with the learner's email. It gives one year of Pro marked `source = 'manual'`, which counts on uxgate.org too. Nothing renews or charges it, and plan events leave it alone. Running it again resets the year.

```sql
insert into public.entitlements (user_id, plan, valid_until, pro_since, source) select id, 'pro', now() + interval '1 year', now(), 'manual' from auth.users where email = 'qa@example.com' on conflict (user_id) do update set plan = 'pro', valid_until = excluded.valid_until, pro_since = coalesce(public.entitlements.pro_since, excluded.pro_since), source = 'manual', updated_at = now();
```

To take it back:

```sql
update public.entitlements set plan = 'free', valid_until = null, pro_since = null, pro_ended_at = now(), source = 'live', updated_at = now() where source = 'manual' and user_id = (select id from auth.users where email = 'qa@example.com');
```

## 13. Faster signed-in pages (0039, issue #184)
Run once in the SQL editor, after 0036. It changes no data and is safe to read before running.
1. Paste `migrations/0039_learner_state.sql` and run it. It adds `my_learner_state()`, which returns everything the app shell shows about the signed-in learner in one call, instead of 10 to 14 separate reads per page.
2. Check: `select proname from pg_proc where proname = 'my_learner_state';` returns one row.
3. The app works before it too, only slower: until the function exists it uses the separate reads.
4. To see the effect, open a signed-in page with the browser's developer tools, Network tab, and look at the page request's Timing: `db` shows the database wait and the number of calls. `wrangler tail` shows one `db ...` line per page with each call.
