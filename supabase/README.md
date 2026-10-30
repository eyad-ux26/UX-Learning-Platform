# Supabase setup (staging and production)

The database lives in `migrations/`. The sign-in emails live in `templates/`. Nothing here holds a secret.

## 1. Create the project
1. New Supabase project (staging first). Region close to learners in Egypt and the Gulf.
2. Run `migrations/0001_core_loop.sql` in the SQL editor.
3. Seed the content: `npm run seed:content` (needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your shell; never commit them).

## 2. Where each key goes
| Value | Where |
| --- | --- |
| Project URL | Vercel env `NEXT_PUBLIC_SUPABASE_URL` |
| anon (public) key | Vercel env `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key | Vercel env `SUPABASE_SERVICE_ROLE_KEY` only. Never in chat, git or the browser. |

## 3. Authentication settings (Authentication > Sign In / Providers)
- Email: on, "Confirm email" on, password minimum length 8.
- Google: on. Client ID and secret from the Google Cloud OAuth client. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
- Authentication > URL Configuration:
  - Site URL: `https://uxgate.org` (production) or the staging URL.
  - Redirect URLs: `https://uxgate.org/api/auth/callback`, `https://*-<vercel-team>.vercel.app/api/auth/callback`, `http://localhost:3000/api/auth/callback`.

## 4. Emails in the learner's language
- Authentication > SMTP: Resend. Host `smtp.resend.com`, port 465, user `resend`, password = the Resend API key (kept in Supabase only). Sender `UXGate <no-reply@uxgate.org>`. The domain `uxgate.org` must be verified in Resend (SPF, DKIM records).
- Authentication > Emails: paste `templates/confirmation.html` into "Confirm signup" and `templates/magic_link.html` into "Magic link". They switch on `.Data.locale`, which the app sets at sign-up and sign-in (`en` or `ar`).
- Subjects: set both in English and Arabic, e.g. `Confirm your email · أكّد بريدك الإلكتروني`.

## 5. Check
`npm run test -w @uxgate/db` runs the row-level security tests with no Docker.
