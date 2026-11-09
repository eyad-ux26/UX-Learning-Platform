# Admin panel: setup and operations (Phase 1)

The admin panel lives at `/admin` on the same Worker as the learner app. It has its own sign-in (`/admin/signin`), two-step
sign-in with an authenticator app, and every change goes through a server action that checks the member's permissions
again and writes an audit entry. The requirements, design boards and build notes are in `docs/design/admin/`.

## 1. Migrations, in this order

Run each file in the Supabase SQL editor, one at a time, and wait for "Success" before the next.

| File | What it adds |
| --- | --- |
| `supabase/migrations/0044_admin_access.sql` | Team members, roles and permissions, invites, super admin grants (24-hour wait), approvals, audit log, admin sessions, learner notes. Ends with the **founding super admin** block. |
| `supabase/migrations/0045_admin_learners_billing.sql` | Learner search, Pro for free (comp) with limits, certificate revoke and re-issue, refund tracking on payments, discount code limits, billing event lookup. |
| `supabase/migrations/0046_admin_support.sql` | Support inbox: settings (SLA per priority, business hours, days off), tickets, messages, macros, round-robin assignment, tickets from refund requests and lesson reports, who decided an appeal. |
| `supabase/migrations/0047_admin_dashboard.sql` | Read-only dashboard numbers: key numbers, money by day, the funnel, active learners per path. |

Numbers 0044 to 0059 are Phase 1; Phase 2 uses 0060 and up. Each file is safe to read before running; none deletes learner data.

### The founding super admin

`0044` makes `uxgate8@gmail.com` the founding super admin if that account already exists. If the account signs up later,
run the block that starts with `-- ───────── founding super admin ─────────` (the last part of 0044) again. It does nothing once a
founding member exists. The founding super admin cannot lose super admin, be suspended or be removed. Anyone else becomes a
super admin only through a grant that waits 24 hours, which any super admin can cancel, and the person granting must
confirm with a fresh authenticator code.

### QA and team accounts

Invite QA testers from **Team and roles** after the migrations run, with the **Viewer / QA tester** role. That role carries
`testing.tools`: the learner app's team testing tools (replay the tour, open any path, mark lessons done) and passing the
Coming Soon gate. The panel writes `app_metadata.team_tools` on the account when roles change; it takes effect at the
tester's next token refresh (sign out and in to apply it at once). Accounts with `app_metadata.role = "admin"` keep working
as before (`docs/coming-soon.md`).

## 2. Worker settings

| Name | Type | Value |
| --- | --- | --- |
| `CRON_SECRET` | Secret | Already set. Also closes `/api/support/inbound` and `/api/cron/admin`. |
| `RESEND_API_KEY` | Secret | Already set. Support replies go out from `UXGate Support <support@uxgate.org>`. |
| `SUPPORT_FORWARD_TO` | Variable | Optional. A copy of every email to support@ also goes to this inbox (for attachments, and as a backup). Suggested: `uxgate8@gmail.com`. It must be a verified destination address in Email Routing. |
| `UG_ENV` | Variable | `staging` on a staging Worker; the panel shows a Production badge otherwise. |

The 15-minute Cron Trigger (already in `wrangler.jsonc`) now also calls `/api/cron/admin`: approval reminders after 4 hours,
and auto-resolving tickets that waited on the learner for the set number of days (Support settings), with the rating email.

## 3. Support email (support@uxgate.org into the inbox)

Today Email Routing forwards support@ to the business Gmail. To bring it into the panel:

1. Cloudflare dashboard > uxgate.org > Email > Email Routing > Routing rules.
2. Edit the `support@uxgate.org` rule. Action: **Send to a Worker**. Worker: `uxgate-web`. Save.
3. Set `SUPPORT_FORWARD_TO` (above) if the Gmail copy should keep arriving.

The Worker's `email()` handler (`apps/web/cf-worker.ts`) reads the message and posts it to `/api/support/inbound`. A reply
with `[#1234]` in the subject from the ticket's own email joins that ticket; anything else opens a new one. Out-of-office,
bounces and our own mail are skipped. If the app is down and no forward is set, the sender gets a "try again later" bounce
instead of the mail being lost.

## 4. Break-glass

- **A member lost their authenticator app.** Supabase dashboard > Authentication > Users > the member > delete their MFA
  factor. At the next sign-in the panel asks them to set up two-step sign-in again. Note it in the audit log by hand
  (a short note in Team and roles is enough) since the dashboard change is not logged by the panel.
- **The founding account is locked out.** Recover the Google or email sign-in for `uxgate8@gmail.com` first, then reset its
  MFA factor as above. The founding membership itself cannot be removed, so access returns as soon as sign-in works.
- **Someone must be removed now.** Team and roles > the member > Suspend. Their admin sessions end on the next request.
  For a super admin other than the founding one, remove super admin from the Super admins page (a fresh code is asked).
- **Sign-in is paused for an email** after repeated wrong codes: it unblocks by itself after 15 minutes.

## 5. Routes the panel adds outside /admin

| Route | What it does |
| --- | --- |
| `/api/support/inbound` | Email intake (Bearer `CRON_SECRET`, called by the Worker's email handler only). |
| `/api/cron/admin` | Housekeeping (Bearer `CRON_SECRET`, called by the 15-minute cron). |
| `/api/auth/confirm-email` | The link in an email-change email sent by support. |
| `/{en,ar}/rate/{token}` | The one-question support rating page (open past the Coming Soon gate). Opening it records nothing; the learner presses Send. |

## 6. Checks

- `npm run test -w @uxgate/db` runs the database tests, including the admin access rules (`supabase/tests/admin.test.ts`).
- `npm run admin:assets -w @uxgate/web` rebuilds `app/admin/admin-icons.css` after an icon is added to the panel.
