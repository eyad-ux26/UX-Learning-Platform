# Admin panel, Phase 2

Phase 2 adds content, quality, reports, communications, platform settings, system health, the help centre, media, free
trials and price change requests to the admin panel at `/admin`. It builds on Phase 1 (access model, audit log,
approvals, learners, support, billing). Every page checks the member's permissions, every change goes through a server
action that checks them again, and every change is written to the audit log.

## Migrations to run, in this order

Run them in the Supabase SQL editor after Phase 1's migrations (0044 to 0046).

1. `supabase/migrations/0060_admin_content.sql`: versioned lessons, drafts, releases, the Phase 2 permissions.
2. `supabase/seed/content-live.sql`: the v1 import. It makes the versions already in `content_versions` live as v1.
   Run it once, after 0060. (The normal content seed `supabase/seed/content.sql` also syncs from now on, and never
   overrides a lesson that was published from the panel.)
3. `supabase/migrations/0061_admin_settings.sql`: feature flags with labels, learning rules, access settings, the team
   password hash, `app_config()`.
4. `supabase/migrations/0062_trials.sql`: free trials (off until the `trials` flag is on).
5. `supabase/migrations/0063_admin_grow.sql`: content quality, reports, saved reports, announcements, campaigns, help
   articles, job runs.

Before each one runs, the screens that need it say so and keep working with what they have.

## Flags (Platform settings, then Feature flags)

All new flags start off.

| Flag | On means |
| --- | --- |
| `content_db` | Learners get the lesson versions published from Content, then Releases. Off: the compiled content files. |
| `trials` | New learners who never had Pro can start a free trial. The terms say "No trial": change them first. |
| `announcements` | Scheduled announcements show as a banner on the learner Home. |

## What each area does

- **Content** (`/admin/content`): every path, unit and lesson with what is live, in draft and in review. The lesson
  editor changes words only, English and Arabic side by side, with the automatic checks (8 to 12 steps, try-first,
  contrast, independent step, no empty text, both languages updated) and a phone preview of the saved draft. A draft
  goes for review as a release; a publisher who did not edit it publishes it (fresh two-step code and typing PUBLISH)
  or sends it back. A published release can be rolled back with a reason; the change is kept as a draft.
- **Skills and misconceptions**: per path, first tries right, learners at Shown and Kept, the misconceptions hit most.
- **Content quality**: steps with fewer than 50% right first time (after 20 tries), more than 25% revealing the
  answer, or reported by learners. The team marks each one To check, Fixing, Fixed (a reminder to check again in a
  week) or Won't fix (with a reason).
- **Media library**: every clip in the lessons, where it is used, and whether its captions are complete in both
  languages.
- **Reports**: learning, growth, money (needs `revenue.view`) and certificates for 7, 30, 90 or 365 days, as tables
  and CSV. A saved report can be emailed to chosen team members every Monday.
- **Communications**: announcements (in-app banner), email campaigns (sent about 100 every 15 minutes from the send
  time, each person once, in their language, with a one-click "turn off news emails" link), previews of every email
  the app sends, the launch list (masked) and the email log. Over 500 people, a second member with `comms.approve`
  approves first (Team and roles, then Approvals). The audience is counted again when a campaign starts sending and,
  for an announcement, in the 30 minutes before it starts and while it runs. If it has grown past 500 without an
  approval, or more than 10% past the approved count, it goes back to draft with a note, and scheduling it again asks
  for approval. A campaign never goes to more people than were counted when it started. Only accounts with a
  confirmed email that are not suspended get campaigns.
- **Platform settings**: feature flags, learning rules, access and maintenance, team password, legal page status.
  Each change needs a reason and a fresh two-step code; risky ones also need a typed word. Servers pick changes up
  within a minute.
- **System health**: the services the app needs (database, email, Paddle, Paymob, Bunny, push, secrets) and when each
  scheduled job last ran.
- **Free trials** (Money): running, paid after and ended trials; support extends one with a reason.
- **Prices and plans**: a price change is asked for here and approved by a second person.
- **Help centre**: articles in English and Arabic, published to the learner Help page after the quick answers.

## Judgment calls for the Admins to review

1. The panel edits lesson words only. New steps, answers, mocks and videos still go through the content files and a
   pull request, where the full validator runs.
2. Lessons published from the panel stay live when the content seed runs again; the seed only updates lessons the
   panel never published. Learners get panel versions only while `content_db` is on.
3. Lesson titles in lists come from the compiled content files, so a title changed in the panel shows in the lists
   after the next content build.
4. The week start is not a setting: it is fixed per learner at sign-up, and changing it would move weeks already counted.
5. The panel can turn the Coming Soon gate and maintenance on. A Cloudflare variable that is on (UG_COMING_SOON,
   UG_MAINTENANCE) stays on until it is removed in Cloudflare. The Coming Soon gate from the panel is enforced by the
   middleware (pages), not by the API routes.
6. A team password set in the panel wins over the Cloudflare secret. Only its PBKDF2 hash is stored; changing it ends
   every team pass given with the old one.
7. Legal text stays in the code (`lib/legal-text.ts`); the panel shows its status. A lawyer-approved text goes in as one
   reviewed change.
8. Trials: no card needed; one per learner; anyone who ever had Pro is refused; 3, 7 or 14 days (Learning rules);
   the "ends in 2 days" and "ended" emails always arrive, like billing emails. Support can add 1 to 14 days at a time,
   60 in all.
9. Campaigns go only to learners who did not turn off news emails. "News" is not yet a row on the learner's
   Notifications screen; it is turned off from the link in every campaign email.
10. Email templates are previewed, not edited, so English and Arabic always change together in code.
11. A price change request is approved in the panel; putting it in place (a new Paddle price and the price list in
    `lib/billing/pricing.ts`) is one reviewed change after that. People already subscribed keep their price.
12. Learner messages that name a rule's number (for example "5 goal days earn a freeze") still say the default.
13. Scheduled jobs that email learners have no "Run now" button; they run on their schedule only.
14. Instructors: there are no instructor profiles in the learner app yet (the hybrid instructor cards are still in
    design), so the Instructors screen is not built; the permissions exist for when it is.
15. Every feature flag change asks for the flag's name typed, a reason and a fresh two-step code. The maintenance
    message needs a reason and a fresh code too.
16. A weekly report only goes to members whose roles allow it (the Money report needs `revenue.view`), checked when it
    is saved and again on every send. Only the person who saved a report, or an Admin, removes it.
17. Free Pro given by support during a trial ends the trial with no "trial ended" email. Learner 360 still labels a
    learner on a trial as Free (with the Pro end date); the label comes from Phase 1's learner list.

## Questions for the Admins

- **News emails need consent?** Campaigns go to every confirmed account that did not turn news off. Egypt's data
  protection law and the GCC rules generally expect opt-in consent for marketing email. Decide whether news needs a tick
  at sign-up, or a one-time "Get news from UXGate?" choice, before the first campaign.
- **Trial extension vs free Pro:** Support can add up to 60 days to a trial (14 at a time) but give only 30 days of
  free Pro. Keep both, or make them match?

## Not in this build

- **Merge two learner accounts** (LRN-6): it rewrites about 30 learner tables (progress, streaks, skill states,
  certificates, subscriptions). It needs the Admins' rules first, for example which streak wins, what happens when both
  accounts have a subscription, and whether certificates move. Proposed default: keep the longer streak and the higher
  skill state, move attempts and XP, refuse when both accounts have a live subscription.
- Changing the USD rate used for reports, and new discount kinds (still in code).
