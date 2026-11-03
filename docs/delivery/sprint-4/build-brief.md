# Slice 4 build brief: account, notifications and public site

For the **Build slice 4** thread (a new thread). Written by the PM thread, 3 November 2026, after Eyad approved the slice 4 design. Start when Eyad sends "build slice 4" in the project chat. Branch from `build/slice-1` (PR #36) and merge slice 2 and 3 in as they pass verify.

## Goal

A learner can manage everything about their account: language, theme, goal, reminders, sound, notifications, their data, and deleting it. They get the right reminders and emails, can ask for help, and can sign in with Apple. Guests find UXGate through public path pages, and every system page is designed.

## Sources of truth (read first)

| What | Where |
| --- | --- |
| Approved design | Canvas https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx v53, page "8 · Slice 4 · Account and public" |
| Design files | Draft PR #67: `docs/design/slice-4/` (README records the PM's product calls) |
| Product calls | [design-review.md](design-review.md) (one reminder email a day at most, delete undo within 30 days, billing emails always on, push ask after the first lesson, "The UXGate team" signature, sender hello@ via send.uxgate.org) |
| Product rules | `docs/product/spec.md` §2 (settings), §4.9 (notifications), §4.5 (review requests) |
| Stories | EN-03 (Apple), EN-05 (rest), EN-19, EN-22, EN-24, appeals (learner side) |
| Done rules | `docs/delivery/definition-of-done.md` (including the tech gate) |
| Credits | `/mnt/project-files/delivery/credits-policy.md`: build on Sonnet high |

## In scope

| ID | Story | Notes |
| --- | --- | --- |
| EN-22 | Settings, data and account | Every setting from the canvas; JSON export; delete with a 30-day undo by signing in, "Sign in before <date> to undo" on screen and by email; delete stops renewal |
| EN-19 | Notifications | Inbox with a bell and count badge on Home and Profile; push ask after the first lesson ends (never again on that device after "Not now"); email kinds as designed; at most one reminder email a day, using "Today's goal still open" when the goal is open and the streak is 3+ days; billing emails always on |
| — | Emails | All 7 templates in EN and AR, sent through Resend from hello@uxgate.org on send.uxgate.org (DNS added on 3 Nov), replies to support@uxgate.org |
| — | Help and requests | Help page, "My requests" with status and answers for review requests from lessons |
| EN-05 (rest) | Public path pages | One static page per path in both languages with `hreflang`, Coming soon variant, LCP under 2.5 s on 4G |
| EN-24 | Privacy and terms | Pages and layout at /privacy and /terms; **placeholder text** until Eyad signs off the text (https://claude.ai/artifact/7J7vyELaFbJkptMRc13zBc) |
| — | System pages | 404, error, offline, maintenance |
| EN-03 (Apple) | Sign in with Apple | Ask Eyad for the Apple Developer setup when you reach it; route dashboard steps through the device session |
| — | Google button | Google's brand-style button everywhere |

## Out of scope

Payments and paywall (slice 5). Admin answers to requests (admin waterfall).

## Acceptance checks (the verify thread runs these)

1. Every setting saves, survives a reload, and applies at once, in both languages and themes.
2. The data export downloads JSON with only this learner's data.
3. Deleting signs out and schedules removal for 30 days later. Signing in before then undoes it. The email arrives with the right date in the learner's language.
4. At most one reminder email reaches a learner per day. The streak copy appears only when the goal is open and the streak is 3 days or more. No loss-framed words appear anywhere.
5. Each notification kind can be turned off, except billing. The bell count matches unread inbox items.
6. The push ask appears only after the first lesson ends, and never again on that device after "Not now".
7. Emails come from hello@uxgate.org and pass SPF, DKIM and DMARC checks.
8. Public path pages are static, have `hreflang`, and meet LCP under 2.5 s on 4G.
9. Apple sign-in works in both languages.
10. Every screen matches canvas v53; axe shows no serious issues; RLS tests cover the new tables; the tech gate passes.
11. CI is green and the PR has a Cloudflare preview link. Push in batches.

## How to work

- One PR, commits per story; the PR body lists each story with its checks ticked.
- Post the preview link when checks 1–11 pass, then stop for the verify thread.
- Do not merge. Eyad merges after the gate.
