# Backlog and sprint plan

Version 2, 30 October 2026. GitHub Issues is the live backlog: one issue per epic (label `epic`) and one per story (label `story`), each tagged with its slice and sprint labels. This file is the planning snapshot; when they differ, the issues win. Epics are #10 to #19 and #21; Sprint 1 and 2 stories are open as sub-issues of their epics, and later sprints' stories are listed in each epic and opened at that sprint's planning.

## How we work

- **Sprints:** 1 week, Thursday to Wednesday. Sprint 1 starts Thursday 29 October 2026.
- **Capacity:** admins have 10 to 20 hours a week. Claude Code and Claude Design do most of the building; admin time goes to decisions, review and testing. Plan for about 20 points a sprint.
- **Points:** 1 (under an hour of admin review), 2, 3, 5, 8 (split before the sprint starts).
- **Rituals (async, in the project thread):**
  - Thursday: sprint planning. Claude posts the proposed sprint; admins confirm or change it.
  - Daily: the progress checklist in the thread shows what moved.
  - Wednesday: review (demo link per story) and a short retro (keep, change, try).
- **Pipeline:** design one sprint ahead; build, security and testing of a slice run in the following sprint. Threads and gates: [process.md](process.md).
- **Content runs in parallel**: units of Paths 1 and 10, and the hybrid path, keep their one-PR-per-unit flow outside these sprints.
- **Merging:** no PR is merged without admin approval. Content PRs stay open until one interactive path and one hybrid path are approved as the model.

See [definition-of-done.md](definition-of-done.md) for Ready and Done.

## Release plan

Version 2 (30 October 2026) follows [process.md](process.md): each slice is designed in one sprint and built, secured and tested in the next. The learner web app comes first; the admin panel follows as one waterfall project.

| Milestone | When | Outcome |
| --- | --- | --- |
| M1 Core loop live | End of sprint 2 (11 Nov) | Slice 1 built and verified: sign up to lesson end on a preview |
| M2 Full learning experience | End of sprint 4 (25 Nov) | Slices 2 and 3: every step type, mastery, progress, review |
| M3 Web app feature complete | End of sprint 6 (9 Dec) | Slices 4 and 5: settings, notifications, public pages, subscriptions in test mode |
| M4 Web app release candidate | End of sprint 7 (16 Dec) | Full regression, accessibility and security audit passed |
| M5 Admin panel | Sprints 8–13 (to about 27 Jan) | Waterfall: design, build, security and testing of the whole admin panel |

Dates move with real velocity; the PM thread re-plans at each sprint review.

## Slices

### Slice 1 · Core loop · design sprint 1 ✓ · build and verify sprint 2

Landing, sign up and sign in, onboarding, home, path map, lesson player with the step types of one real unit, lesson end, sound effects. Stories: EN-01, EN-02, EN-03 (email and password, email link, Google), EN-04, EN-05 (landing only), EN-06 (one unit), EN-07 (card, choose, predict, hints and reveal), EN-09, EN-11 (basic states), EN-13 (XP and daily goal count only). Build brief: [sprint-1/build-brief.md](sprint-1/build-brief.md).

### Slice 2 · Full lesson player · design sprint 2 · build sprint 3

Every remaining step type (words, fix, tune, sort, order, match, spot, compare, video), concept card, confidence tap, skill check, mastery round, exit and resume, guest sample lesson, offline and saving states inside a lesson. Stories: DS-06 (part), EN-07 (rest), EN-08, EN-10, EN-12, EN-14. Design brief: [sprint-2/design-brief.md](sprint-2/design-brief.md).

### Slice 3 · Progress and motivation · design sprint 3 · build sprint 4

Daily goal and streak with freezes, skill states and badges, review queue and review sessions, profile, certificate, public achievement page, opt-in leaderboard. Stories: EN-11 (rest), EN-13 (rest), EN-20, EN-21, EN-23.

### Slice 4 · Account, notifications and public site · design sprint 4 · build sprint 5

Settings (language, theme, goal, reminders, sound, data export, delete account), notifications (inbox, email templates, push prompt), help and appeals on the learner side, public path pages with SEO, system pages (404, error, offline, maintenance), Sign in with Apple. Stories: EN-03 (Apple), EN-05 (rest), EN-19, EN-22, appeals (learner side).

### Slice 5 · Subscriptions · design sprint 5 · build sprint 6

Pricing, paywall, checkout result, billing and plan management, cancel and refund request, billing emails. Paymob and Paddle in test mode. Stories: EN-15 to EN-18.

### Sprint 7 · Web app release candidate

QA-01 accessibility audit, QA-02 security audit, performance pass, full regression in both languages and themes, PM-02 beta plan. PM writes the admin panel requirements (sprint 6) so the admin design can start in sprint 8.

### Admin panel · waterfall · sprints 8–13

1. Requirements (PM, sprint 6): every admin area from the spec §6, roles, audit log.
2. Design (design thread, sprints 8–9): the whole admin panel, desktop first.
3. Build (one build thread, sprints 10–12): AD-01 to AD-07.
4. Security and testing (one verify thread, sprint 13).
5. Release.

## Epics

| Epic | Stories |
| --- | --- |
| E1 Design system and prototype | DS-01 to DS-09 |
| E2 Platform foundation | EN-01, EN-02, EN-06 |
| E3 Accounts and onboarding | EN-03, EN-04, EN-22 |
| E4 Public site | EN-05 |
| E5 Lesson player | EN-07 to EN-10, EN-14 |
| E6 Progress, mastery and motivation | EN-11 to EN-13, EN-20, EN-21, EN-23 |
| E7 Subscriptions and payments | EN-15 to EN-18 |
| E8 Admin panel | AD-01 to AD-07 |
| E9 Notifications | EN-19 |
| E10 Quality, security and beta | QA-01, QA-02, PM-02 |
| E11 Content for the beta | Paths 1 and 10, the hybrid path (runs in parallel) |

## After the beta

Full content editor in admin, coupons, cohorts in reports, more paths (one a month), native-feeling PWA install prompts, minors' safeguards, other tech fields.
