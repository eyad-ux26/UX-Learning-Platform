# Slice 4: account, notifications and public pages

Live boards: https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx, page "8 · Slice 4 · Account and public" (canvas v51, 10 rows and the moments board). Each row shows every state of one part in four frames: mobile 390 English light, mobile 390 Arabic night, desktop 1440 English light and desktop 1440 Arabic night (desktop shown at half size). Email rows show a 390 phone and a 760 desktop mail window instead; public path pages are shown at full length. The five components below are on "Screen parts" and are clickable there.

Brief: `delivery/sprint-4/design-brief.md` in project files. Styles are in `../system/uxgate.css`, in the block that starts with "Slice 4". Same tokens, Cairo and Titillium Web, no loss-framed copy, `[PRICE]`, `[DATE]` and `[TIME]` stay placeholders.

## Components

All take `lang` (`en`, `ar`), `theme` (`light`, `dark`), `device` (`mobile` 390×844, `desktop` 1440×900) and `view`.

### `AccountPages.dc.html`

| `view` | What it shows |
| --- | --- |
| `settings`, `settingsMore` | Settings as one list on a phone (the second view is the same list scrolled), two columns on desktop. Account; language, theme (System, Light, Dark), daily goal (1, 2, 3 lessons), the daily reminder with the same picker as onboarding and Profile (`remVals` is a copy of ProfilePages, keep them in step), sound; notification choices; sharing switches for the achievement page and the leaderboard (both off by default); your data; help, privacy, terms; sign out |
| `notifs`, `notifsBlocked` | Notification choices as kind × channel (In app, Email, Push). Six kinds: daily reminder, review due, "Today’s goal still open" (once, in the evening), badges and certificates, answers to your requests, billing (email always on). The push column turns off when push is off or blocked in the browser, with how to fix it |
| `data` | Download my data as one JSON file (what it holds) and Delete my account |
| `deleteAsk` | What happens first (signed out everywhere, removed within 30 days, shared links stop, a subscription stops renewing), "Download your data first", one tick to confirm, then the red button. "Keep my account" is the easy way out |
| `deleteDone` | Signed out, removal scheduled for a date, and how to undo it before then |
| `pushAsk` | Our own ask, shown only after a reminder is set: what push brings, "Turn on notifications" or "Not now". "Your browser asks next. We ask once on each device." |
| `pushBrowser` | The browser’s own prompt after Turn on (drawn as a MOCK) |
| `pushLater` | Not now: a toast that says email reminders still come |

### `InboxPages.dc.html`

| `view` | What it shows |
| --- | --- |
| `inbox` | New items first, then Earlier, with Mark all as read. Each item says where it opens: an accepted review answer, the next lesson, a badge turning gold, skills to review, today’s goal, a payment receipt |
| `inboxEmpty` | Nothing yet, and what will arrive here |
| `help` | support@uxgate.org with "Email support", My requests, notification choices, five quick answers, privacy and terms |
| `requests` | Every "Ask for a review" sent from a lesson, with status: Accepted, Waiting for a reply, Kept as is |
| `requestAnswer`, `requestKept` | The step as the learner saw it, their answer, the reason they gave, the reply, and what changed (accepted: XP added and the skill counts) |

### `PublicPages.dc.html`

Takes `pageh` for the full-length path pages.

| `view` | What it shows |
| --- | --- |
| `path` | Interactive path page (Forms That Flow): facts, what you will be able to do, units with Unit 1 free, a sample step the visitor can answer and check without an account, how the path teaches, the `[PRICE]` band, footer |
| `pathHybrid` | Hybrid path page (Patterns That Fit): the same page with a sample clip and the clip-then-practice explanation |
| `pathSoon` | Coming soon path (Make UX Accessible): says it is not open yet and points to paths that are |
| `privacy`, `privacyToc`, `terms` | Reading pages with last updated `[DATE]`, the other language, and a table of contents (a collapsible button on a phone, a side list on desktop). The text is SAMPLE TEXT from the spec; the final text comes from the admins |

### `SystemPages.dc.html`

| `view` | What it shows |
| --- | --- |
| `notFound`, `error`, `offline`, `maintenance` | What happened, that progress is safe, and what to do next. The error page shows a reference to send to support |
| `signup`, `signin` | Sign up and sign in with Apple and Google buttons that follow each brand’s rules (Apple black, white on night; Google white with the four-colour mark, dark on night; the same size, no UXGate ledge), then email and password, and the email-link option |
| `forgot` | Reset password, with a note for people who signed up with Apple or Google |
| `linkSent` | Check your email: works once, for 1 hour; Send again after a countdown |

### `EmailPages.dc.html`

`device` is `mobile` (390) or `desktop` (760 mail window). Views: `reminder`, `goal` (today’s goal still open, sent once), `link` (sign-in link), `reset`, `welcome`, `badge`. The mail-app bar on top is a MOCK; below it is the email: one 600 px column, solid colours, the button ledge drawn as a bottom border, a copyable link under every button that signs in. Reminder-type emails have one-click "turn off" links in the footer. Sign-in and reset emails always arrive and say so.

### `RowS4Moments.dc.html`

Every slice 4 moment with its illustration and sound. All illustrations are from `../system/illustrations/`. No new sound files.

## Assumptions to confirm

- Deleting an account can be undone by signing in within the 30 days.
- Deleting an account stops a subscription from renewing.
- Billing emails can’t be turned off.
- After onboarding, the push ask waits until the first lesson ends. After "Not now" we never ask again on that device.
- The streak-at-risk email is called "Today’s goal still open" and is sent once, in the evening, only on days the learner has started.
- The support reply is signed by a named team member (sample: Laila).
- The P14 path counts (6 units, 25 lessons, 48 skills) are placeholders.
- The sender is `UXGate <hello@uxgate.org>`.
- Coming soon paths have no "notify me" yet.
- The bell with a count badge on Home and Profile opens the inbox. It needs adding to the slice 3 screens in the build.
- Arabic emails use the same form of address as the app.
