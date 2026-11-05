# Slice 4 design brief: account, notifications and public site

For the **Design** thread (a fresh thread for slice 4, started from the handoff). Written by the PM thread, 2 November 2026, after Eyad approved the slice 3 design. Build follows in the next build sprint.

Slice 4 is everything around the lessons: the learner's settings and data, the reminders and messages they get, help, the public pages that bring new learners in, and the system pages.

## Before you start

Slice 3 was approved by Eyad on 2 November 2026 (canvas v48, PR #56). Keep building on the same canvas and design system. Add a new page, "8 · Slice 4 · Account and public".

## Deliver

All in mobile (390) and desktop (1440), EN light and AR night, using the existing design system unless something new is needed.

| # | Screen or state | What to show | Rules |
| --- | --- | --- | --- |
| 1 | **Settings** | Language, theme, daily goal, reminder (reuse the time picker), sound, notification choices per kind and channel, achievement page switch, leaderboard switch, sign out | Spec §2 (settings), EN-22 |
| 2 | **Data and account** | Download my data (JSON), delete my account with a clear confirmation ("removed within 30 days", signs out), and the state after deletion is scheduled | EN-22 |
| 3 | **Notifications inbox** | List, unread and read, empty state; each item opens what it points to | EN-19, spec §4.9 |
| 4 | **Push prompt** | An in-app ask before the browser's prompt, shown only after the learner sets a reminder; the "not now" path | EN-19 |
| 5 | **Email templates** | Daily reminder (next lesson in the current path), streak at risk (sent once, never loss-framed), sign-in link, password reset, welcome, achievement earned; EN and AR, a simple layout that works in email clients | EN-03, EN-19 |
| 6 | **Help and appeals (learner side)** | Help page with support@uxgate.org, "My requests" listing each human-review request sent from a lesson with its status, and the answer view | Spec §4.5, AD-04 learner side |
| 7 | **Public path pages** | One page per path from the landing: what you'll be able to do, units, a sample step, interactive or hybrid, free first unit, sign up; Coming soon variant | EN-05, SEO |
| 8 | **Privacy and terms** | `/privacy` and `/terms` reading layout, table of contents, last updated date, both languages; Eyad provides the final text | EN-24 |
| 9 | **System pages** | 404, error, offline, maintenance | Backlog slice 4 |
| 10 | **Sign in with Apple** | Add Apple to sign up and sign in, following Apple's button rules | EN-03 |
| 11 | **Illustrations and sound** | UXGate illustrations on empty, error and offline states; no new sound files unless needed | handoff 05 |

## Copy

Write EN and AR together (simple MSA, English UX terms kept with a short explanation). No loss-framed copy in any reminder or email. `[PRICE]` stays a placeholder until Eyad sets the price.

## Credits

Follow `/mnt/project-files/delivery/credits-policy.md`: new screens on Opus high. Republish the canvas at milestones, and take feedback in one batched message per review.

## Gate

Post the canvas link and open a draft design PR when done. The PM thread reviews against this list, then Eyad approves.
