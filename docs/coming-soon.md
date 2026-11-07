# Coming Soon gate (pre-launch)

Until launch, the public sees only the Coming Soon page. Admins sign in and use the whole tool to test updates. The design is canvas v70, page "10 · Pre-launch · Coming soon" (`docs/design/prelaunch/README.md`).

## The switch

`UG_COMING_SOON` in `apps/web/wrangler.jsonc` (`vars`) turns the gate on (`"1"`) or off. It is a Worker variable, so it reaches production and branch previews alike. On launch day, set it to `"0"` in a pull request.

The gate is the same on every host (workers.dev today, uxgate.org after the move). It never checks the hostname.

## Who sees what

| Visitor | What they see |
| - | - |
| Not signed in | The Coming Soon page, at whatever address they opened (the address stays, the page is the Coming Soon one). |
| Signed in, not an admin | The same page with "You're on the list" and **Sign out**. |
| Admin | The whole tool, with a **Pre-launch · team view** badge on every app screen. It links to the public page. |

Open to everyone while the gate is on:

- `/coming-soon` and its confirmation link `/coming-soon/confirm`
- `/team`, the team password page (below)
- `/terms`, `/privacy`, `/refund` (Paddle's website review and Google's brand verification read them)
- `/maintenance`, `/offline`
- every `/api/*` route (webhooks, cron, auth callback, video), static files and `/_next`

`/signin`, `/forgot` and `/reset` open only with a team pass or an admin session. Everything else shows Coming Soon. Search engines may index the home address and the legal pages only. Every other page carries `X-Robots-Tag: noindex`, for admins too. The sitemap lists the home address, and the legal pages only once their text is approved (`LEGAL_STATUS.approved` in `apps/web/lib/legal-text.ts`, which waits for the admins' sign-off on the placeholders). Until then it lists only `/en` and `/ar`.

The server also refuses, for anyone but an admin:

- new email sign-ups (`signUpAction`);
- every billing API call (checkout, plan changes, codes, refunds, student checks), lesson answers (`/api/attempts`), lesson videos (`/api/video`) and review requests, with `403 coming_soon`. A learner's own data export stays open.

Only someone past the team password reaches sign-in. A Google sign-in there can still create an account that is not an admin; it sees the member view.

## Team password (the door in front of sign-in)

Nothing on the Coming Soon page links to sign-in. The team opens `uxgate.org/en/team` (or `/ar/team`), types the team password, and the normal sign-in page opens. The password sets a pass (the `ug_team` cookie, HttpOnly) for 12 hours on that browser.

- The password is the Worker secret `UG_TEAM_PASSWORD`. An admin sets it in Cloudflare: Workers & Pages, `uxgate-web`, Settings, Variables and Secrets, Add, type **Secret**. It is never in the code, the chat or a pull request. Use at least 16 characters; shorter than 12 is refused, and with no password set nobody gets a pass.
- Changing the password ends every pass at once.
- Every try counts, right or wrong: 5 per network per 15 minutes and 100 an hour from everyone together (`hit_team_gate`, 0038). If the counter cannot be read, nobody gets in.
- The pass only opens the sign-in pages. The app itself still needs the admin role, checked on every request.

## Making an account an admin

An admin is an account whose `app_metadata.role` is `"admin"`. Only the service role can write `app_metadata`, and Supabase copies it into the session token, so the middleware reads it with `getClaims()` without a database call.

In the Supabase SQL editor, list every account that must keep using the tool: your own, and the QA accounts (`qa@…`, `qa2@…` and the other manual-Pro test accounts). QA and the Tech Consultant's smoke tests run on the workers.dev host, which the gate covers too, so they break the moment the gate is on if their accounts are not admins.

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email in ('you@example.com', 'qa@example.com', 'qa2@example.com');

-- check: every account that should be an admin is listed here
select email from auth.users where raw_app_meta_data ->> 'role' = 'admin' order by email;
```

Then sign out and sign in again on those accounts, so the new token carries the role. Otherwise the old token expires within the hour and the role arrives then.

A session that is already signed in as an admin does not need the team password. Signing in again (or on a new browser) does: whoever runs QA needs the password from you, or you sign the QA browser in yourself.

To remove the role, run the same update with `raw_app_meta_data - 'role'`.

## The launch list (double opt-in)

Migration `0038_waitlist.sql` adds `public.waitlist`. Only the service role reads or writes it.

1. The form posts to `/api/waitlist`. The visitor's address is stored unconfirmed, with its language and the consent line, and the confirmation email (`launchConfirm`) goes out from `hello@uxgate.org`.
2. The email's link is `/{locale}/coming-soon/confirm?t=…` on the host the visitor used. It works for 7 days. Opening it puts the address on the list and shows "You're on the list".
3. Unconfirmed addresses are deleted after 30 days, by the daily job (`prune_waitlist`).
4. On launch day, confirmed addresses get one email (`launchLive`), with a link to leave the list. That email and its sender are built at launch.

Guards:

- same origin only;
- a hidden field that bots fill in;
- 5 tries a minute per network on each Worker instance;
- 5 new addresses an hour per network, from a keyed hash of the IP (the IP itself is never stored);
- at most 5 confirmation emails per address, 2 minutes apart.

The form says "already on the list" only for a confirmed address. For anything else it says "check your inbox".

The confirmation email needs `RESEND_API_KEY`, and `uxgate.org` must be verified in Resend (which needs the domain's DNS). Until then the form still works: the address is saved unconfirmed and queued, and the visitor sees "You're on the list. We'll email you a link to confirm it soon." Once the key is set, the daily job (02:00 UTC) sends every queued address its link, on the site's own address (`NEXT_PUBLIC_SITE_URL`). Typing the address again also sends it at once.

To read or export the list, open the `waitlist` table in the Supabase table editor, or run `select email, locale, confirmed_at from waitlist where confirmed_at is not null and unsubscribed_at is null;`.

## Before turning it on

1. Run `0038_waitlist.sql` in the Supabase SQL editor.
2. Make your own account and the QA accounts admins (above).
3. Set the `UG_TEAM_PASSWORD` secret in Cloudflare.
4. Later, once uxgate.org's DNS is on Cloudflare: verify the domain in Resend and set `RESEND_API_KEY` (one secrets window with `UG_TEAM_PASSWORD` if possible). The form works before that; it queues the confirmations.
5. Merge. The gate turns on with the deploy. Open `/en/team`, type the password, sign in again.
