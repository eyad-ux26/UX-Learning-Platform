# Backlog and sprint plan

Version 1, 29 October 2026. GitHub Issues is the live backlog: one issue per epic (label `epic`) and one per story (label `story`), each tagged with its sprint label (`sprint-1` … `sprint-9`). This file is the planning snapshot; when they differ, the issues win. Epics are #10 to #19 and #21; Sprint 1 and 2 stories are open as sub-issues of their epics, and later sprints' stories are listed in each epic and opened at that sprint's planning.

## How we work

- **Sprints:** 1 week, Thursday to Wednesday. Sprint 1 starts Thursday 29 October 2026.
- **Capacity:** admins have 10 to 20 hours a week. Claude Code and Claude Design do most of the building; admin time goes to decisions, review and testing. Plan for about 20 points a sprint.
- **Points:** 1 (under an hour of admin review), 2, 3, 5, 8 (split before the sprint starts).
- **Rituals (async, in the project thread):**
  - Thursday: sprint planning. Claude posts the proposed sprint; admins confirm or change it.
  - Daily: the progress checklist in the thread shows what moved.
  - Wednesday: review (demo link per story) and a short retro (keep, change, try).
- **Content runs in parallel**: units of Paths 1 and 10, and the hybrid path, keep their one-PR-per-unit flow outside these sprints.
- **Merging:** no PR is merged without admin approval. Content PRs stay open until one interactive path and one hybrid path are approved as the model.

See [definition-of-done.md](definition-of-done.md) for Ready and Done.

## Release plan

| Milestone | Sprints | Outcome |
| --- | --- | --- |
| M1 Design ready | 1–2 | Design system, all core-loop screens and admin screens, clickable prototype, approved |
| M2 Core loop works | 3–5 | Sign up, path map, lesson player with every step type, attempts saved, progress and streak |
| M3 Business ready | 6–7 | Subscriptions in test mode (Paymob + Paddle), full admin panel v1 |
| M4 Private beta | 8–9 | Notifications, review, certificates, self-review of security and accessibility, beta invites |

Dates move with real velocity; we re-plan at each sprint review.

## Sprint plan

### Sprint 1 · 29 Oct – 4 Nov · Design foundations

Goal: a UXGate design system and the core learner screens, made and approved in Claude Design from the [handoff pack](../design/handoff/). User stories with acceptance checks: [user-stories.md](user-stories.md).

| ID | Story | Pts |
| --- | --- | --- |
| DS-01 | Brand applied to the product: original logo, brand colours, Cairo and Titillium Web, voice | 3 |
| DS-02 | Design tokens: colour (light, dark), type scale for Latin and Arabic, spacing, radius, elevation, motion | 3 |
| DS-03 | Core components with all states: buttons, inputs, choice cards, progress, chips, nav, sheets, toasts | 5 |
| DS-04 | Learning components: step frame, Check bar, feedback sheet, hint, confidence tap, mock-screen frame, XP and streak | 5 |
| DS-05 | Key screens, mobile, EN and AR, light and dark: landing, sign-up, onboarding, home, path map, lesson step states, lesson end | 5 |
| DS-09 | Logo motion review | 1 |
| PM-01 | Technical files: spec, architecture, data model, backlog, user stories, DoD, templates (done) | 2 |

### Sprint 2 · 5 – 11 Nov · Full prototype and app skeleton

| ID | Story | Pts |
| --- | --- | --- |
| DS-06 | Remaining learner screens: every step type, skill check, mastery round, review, profile, settings, paywall, certificate, achievement page, empty, error and offline states | 5 |
| DS-07 | Admin panel screens: content browser, content quality, learner support, appeals, prices, settings, reports, roles and audit log | 5 |
| DS-08 | Clickable prototype of the core loop, plus a desktop layout pass | 3 |
| EN-01 | Monorepo and Next.js app: locales, RTL, theme tokens, lint rule for logical properties, CI | 5 |
| EN-02 | Supabase projects (staging, prod), migrations folder, RLS test harness | 3 |

### Sprint 3 · 12 – 18 Nov · Accounts and public site

| ID | Story | Pts |
| --- | --- | --- |
| EN-03 | Auth: email and password, magic link, Google, Apple; Resend templates in both languages | 5 |
| EN-04 | Profiles, onboarding flow and path recommendation | 3 |
| EN-05 | Public landing and path pages (SSG) with SEO in both languages | 5 |
| EN-06 | Content compiler and publish job: YAML → `content_versions` | 5 |

### Sprint 4 · 19 – 25 Nov · Lesson player

| ID | Story | Pts |
| --- | --- | --- |
| EN-07 | Port the player into `packages/player`: state machine and card, choose, predict, words, fix, tune | 8 |
| EN-08 | Step types sort, order, match, spot, compare | 5 |
| EN-09 | Offline-safe attempt queue (IndexedDB) and `POST /api/attempts` with server scoring | 5 |
| EN-10 | Guest sample lesson and claiming guest attempts on sign-up | 3 |

### Sprint 5 · 26 Nov – 2 Dec · Progress and mastery

| ID | Story | Pts |
| --- | --- | --- |
| EN-11 | Home and path map with lesson and skill states, skill-based unlocking | 5 |
| EN-12 | Skill checks, end-of-unit mastery round, skill states | 5 |
| EN-13 | XP, daily goal, streak and freezes, badges | 5 |
| EN-14 | Video step with Bunny Stream, signed playback, captions and transcript | 3 |

### Sprint 6 · 3 – 9 Dec · Subscriptions

| ID | Story | Pts |
| --- | --- | --- |
| EN-15 | Billing interface, entitlements, free-tier gating and paywall | 5 |
| EN-16 | Paymob checkout, webhooks, renewals by token (test mode) | 5 |
| EN-17 | Paddle checkout and webhooks (sandbox) | 5 |
| EN-18 | Cancel, 7-day refund request, billing emails | 3 |

### Sprint 7 · 10 – 16 Dec · Admin panel v1

| ID | Story | Pts |
| --- | --- | --- |
| AD-01 | Admin shell, roles, audit log | 5 |
| AD-02 | Content browser with preview and publish, from the control board | 5 |
| AD-03 | Content quality statistics per step and variant | 3 |
| AD-04 | Learner lookup and support actions, appeals queue | 5 |
| AD-05 | Prices, subscriptions and refunds | 3 |

### Sprint 8 · 17 – 23 Dec · Engagement and trust

| ID | Story | Pts |
| --- | --- | --- |
| EN-19 | Notifications: inbox, email, push, reminders cron | 5 |
| EN-20 | Spaced review queue and review sessions | 5 |
| EN-21 | Certificates and opt-in achievement pages | 3 |
| EN-22 | Settings: data export, account deletion, notification choices | 3 |
| AD-06 | Platform settings, feature flags, templates, media library | 3 |

### Sprint 9 · 24 – 30 Dec · Beta readiness

| ID | Story | Pts |
| --- | --- | --- |
| QA-01 | Accessibility self-review: axe in CI, keyboard and screen-reader pass on every step type | 5 |
| QA-02 | Security self-review checklist, RLS tests, rate limits, CSP | 5 |
| AD-07 | Reports: sign-ups, activity, completion, paying, correction and transfer | 3 |
| PM-02 | Beta plan: invite list, feedback form, support inbox, launch checklist | 2 |
| EN-23 | Opt-in weekly leaderboards behind a flag | 3 |

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
