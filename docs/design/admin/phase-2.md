# Admin panel · Phase 2 design ("Grow and improve")

Live canvas: https://claude.ai/artifact/1y4y5vR8CAppxXZUFdsq5u ("UXGate Admin Panel", pages 6 and 7; private until shared).
Requirements: https://claude.ai/artifact/FG7zf7gMgUNncmZR6jy7e9 (ids below, such as `CNT-2`, refer to it).
Phase 1 notes: [`phase-1.md`](phase-1.md). Board sources: [`phase-2-boards/`](phase-2-boards/) (new and changed `.dc.html` boards, `admin.css`, `canvas.json`).

Phase 2 covers content (paths, lessons, skills, releases), media, content quality, reports, communications, settings, system health and the help centre, plus three items held back from Phase 1: account merge (`LRN-6`), price changes (`BIL-7`) and trials. It uses the same shell, tokens, status chips and safeguards as Phase 1. Nothing here changes a Phase 1 rule.

All names, numbers and messages on the boards are sample data. Where a board shows a real app value (a flag name, a learning constant, a job time, an email subject, a lesson id), it was taken from the repo on 9 Nov 2026 and is noted below.

## How to review

- **Page 1, Start here**: the map now lists Phase 1 (approved) and Phase 2 (ready for review). Every board is linked.
- **Page 6 · Phase 2 screens**: six rows: content, media and quality, reports, communications, settings and health, then help centre, merge and trials.
- **Page 7 · Phase 2 flows and states**: five clickable flows (9 to 13; use the dark bar at the top), list states for eleven Phase 2 lists, and the lesson editor for two roles.

The Phase 2 menu items no longer open the `#phase-2` placeholder; they link to the real boards.

## Screens and requirements

| Board | Shows | Requirement ids |
| --- | --- | --- |
| ContentPaths | Path tree (path, unit, lesson) with status and EN/AR readiness; details rail | CNT-1, CNT-3 |
| LessonEditor | P15-U01-L01 "Put the words that matter first", 9 steps; EN and AR side by side, live phone previews LTR and RTL, checks (8 to 12 steps, try-first, contrast, independent step), "Arabic not updated" warning; takes a `role` prop | CNT-1, CNT-2 |
| Skills | Skills per path with versions, four-scenario and re-test coverage, right first try, kept; misconceptions per skill | CNT-4 |
| Releases | Release list, review with diff per language, automatic checks, version history with roll back | CNT-5, CNT-6 |
| Media | Videos on Bunny Stream: status, length, captions EN/AR, lesson links, views | MED-1 |
| Captions | Caption editor with waveform and timing, EN and AR, transcript | MED-2 |
| Images | Images and the scenario characters, alt text EN and AR, where used | MED-3 |
| Instructors | Instructor list and drawer with bio in both languages and their videos | MED-4 |
| QualityFlags | Flags from learner reports and from numbers (low right-first-time, high skip), status To check, Fixing, Fixed, Won’t fix | QLT-2, QLT-3 |
| QualityLesson | One lesson's report: step by step right-first-time, time, confidence, answer spread, reports | QLT-1 |
| Reports | Overview, saved reports, scheduled reports (weekly email to admins) | RPT-5 |
| ReportLearning | Lessons finished, skills shown and mastered, hardest skills, paths finished per path (adds up to 96) | RPT-1 |
| ReportGrowth | Funnel 48,200 visits to 96 paths finished, sign-ups by source, trials started, live and converted | RPT-2 |
| ReportMoney | MRR $15,930 by region (Egypt, Gulf, Other Arab countries, Rest of the world) and by provider, churn, refunds, FX 56.2 | RPT-3 |
| ReportCerts | Certificates issued, achievement pages shared, LinkedIn posts | RPT-4 |
| Campaigns | Campaign list with audience, status, approval, results | COM-2 |
| Announcements | In-app banners with EN and AR phone previews, audience and dates | COM-3 |
| EmailTemplates | Real reminder and billing email copy, EN/AR toggle preview, placeholders isolated for Arabic | COM-1 |
| Waitlist | 3,068 confirmed: invite in batches, unconfirmed shown, prune rule | COM-4 |
| EmailLog | Every email sent, delivery state from Resend, search by learner (masked) | COM-5 |
| FeatureFlags | Flags with state, who sees it, last change; only `leaderboard` exists today, the rest are marked as new | SET-1 |
| LearningRules | Freeze, mastery, review timing and trial length (3, 7 or 14 days); the "freezes 2 → 3" change is an example | SET-2 |
| AccessSettings | Coming Soon gate, team password (never shown, only replaced), maintenance mode with EN/AR message | SET-3 |
| LegalPages | Terms, privacy and refund pages EN and AR, version, "sample text" warning until approved | SET-4 |
| PriceChange | Change a price with approval: example is the quarterly Egypt review 249 → 279 EGP; region rules (Iraq in the Gulf) | SET-5, BIL-7 |
| SystemHealth | Status of the site, database, Bunny, Resend, Paddle, Paymob, error rate; Bunny trial warning | SYS-1, SYS-2 |
| ScheduledJobs | The real crons with last run and result; jobs that email learners have no "Run now" | SYS-3 |
| HelpCentre | Help articles EN and AR, linked macros, search terms with no result | SUP-11 |
| MergeAccounts | Two accounts of one learner side by side, what moves (progress, certificate, subscription), typed confirm | LRN-6 |
| Trials | Subscriptions "In a trial" tab, Extend trial drawer (+3 days, reason) | BIL-1, LRN-3, trials |

## Key flows

| Board | Flow | Steps |
| --- | --- | --- |
| FlowLessonPublish | Edit and publish a lesson in EN and AR, with review and roll back | Edit (Arabic flagged as not updated), fix Arabic, send for review (authors can’t publish their own change), publisher opens the release, publish dialog with who it reaches and what happens mid-lesson, live, roll back with a reason, v2 live again and v3 kept as a draft |
| FlowVideoUpload | Upload a video with captions | Library, pick the file (titles EN and AR, linked to a step), upload straight to Bunny, processing, captions EN and AR checked, added as a draft for the next release |
| FlowQualityFlag | Act on a quality flag | Read the flag (P02-U03-L02 S05, misconception MC-P02-026), fix both languages in the editor, send for review with a thank-you to the reporters, Fixing, a week later check the numbers |
| FlowAnnouncement | Announce to 1,040 learners, with approval | Audience with live count (unsubscribed left out), EN and AR message with preview, schedule and test send, ask approval (over 500 people), an admin approves from My work, scheduled, results a week later |
| FlowFeatureFlag | Change a feature flag | Flags, confirm with who it affects, a reason and the typed flag name, fresh two-step code, done with Undo, audit log entry |

## States and roles

- **ListStates2**: empty, loading, error, no access and masked for Paths, Releases, Media library, Content quality, Reports, Campaigns, Waitlist, Email log, Feature flags, Scheduled jobs and Help centre. Each error state says what keeps working for learners.
- **RoleCompare2**: the lesson editor for a content editor and a content publisher. Both edit EN and AR as drafts. Only the publisher publishes or rolls back, and never a change they wrote themselves.
- New roles used on the boards, all from the permission matrix: **Content publisher** (publishes releases, rolls back, closes quality flags), **Marketing** (campaigns, announcements, templates, waitlist; audience counts only, no learner details), **Instructor** (own videos and captions only).

## App work Phase 2 needs

These screens are design only. The build needs these app changes first or alongside:

1. **Content moves to the database.** Today content is YAML in `content/paths/`, compiled to `packages/content/dist` and seeded with `supabase/seed/content.sql`. The editor and releases need versioned content rows (draft, in review, live, retired) and an import of the current content as v1 of every lesson (CNT-6). Until the import, the YAML and pull request route stays the only way to change content.
2. **Learning rules become settings.** `FREEZE_GOAL_DAYS` (5), `FREEZE_MAX` (2), `WEEK_START` (1), `MAX_MASTERY_MISSES` (2), `VARIANTS_PER_SKILL` (2), `REVIEW_AFTER_DAYS` (3) and `MISS_RETRY_DAYS` (1) are code constants today. They move to a settings table with these as defaults.
3. **Access settings move from Cloudflare variables.** `UG_COMING_SOON`, `UG_MAINTENANCE` and `UG_TEAM_PASSWORD` are Worker variables today. The panel needs them in settings; the team password is stored only as a hash and is never shown.
4. **Trials need app support.** The learner app has no trial. It needs a trial status, a length from settings, an end date and the trial emails, behind a new flag `trials` (off). The terms say "No trial" today and must change before the flag is turned on.
5. **Gulf region adds Iraq.** The region list moves Iraq from Other Arab countries to the Gulf price. Existing Iraqi subscribers keep their price.
6. **New flags.** `trials` and `announcements` join `leaderboard` in `app_flags`. `PAYMOB_EG_CARDS_ONLY` is shown as a rule, not a switch.
7. **New jobs.** The weekly scheduled report email and the clean-up of exported CSV files are new jobs. The existing jobs are shown as they are: the daily job at 02:00 UTC (04:00 Cairo: review due, billing, waitlist prune and confirmations) and the 15-minute job (reminders, removal of deleted accounts).
8. **No "Run now" for jobs that email learners.** Those jobs show "Timer only". Other jobs can be run by a super admin with a reason.
9. **Legal pages** are sample text (`LEGAL_STATUS` approved: false) until the Admins sign them off.
10. **Bunny Stream** trial ends around 17 Nov 2026 and needs a card before the media library can rely on it.

## Rules the build must keep

All Phase 1 rules apply. In addition:

- Authors never publish their own change. Publishing and roll back always ask who it reaches, and roll back needs a reason.
- A lesson can’t be published while one language is behind the other, or while an automatic check fails.
- Messages to more than 500 learners, price changes and path publishing need a second admin (four eyes).
- Video files go straight from the browser to Bunny Stream; the panel never holds them.
- Changes that every learner sees (flags, learning rules, access settings, prices) need a fresh two-step code, a reason and the typed name, and are logged.
- Unsubscribed learners are never in an audience.

## Decisions the Admins already made that this design uses

The nine answers recorded in [`phase-1.md`](phase-1.md#judgment-calls-answered-by-the-admins-9-nov-2026): "Rest of the world" region, trials designed now, Phase 2 placeholders, English invite emails, Gulf = GCC plus Iraq, Egypt "Amount set on our server", the time limits, revoke with reason and typed id, and discount codes on the boards are examples (real offers: student 40%, welcome back 40% annual for two years, FOUNDING 30% for the first annual year).
