# UXGate product spec

Version 1, 29 October 2026. Source of truth for decisions: the shared doc "Learning Platform: Full Plan". This file turns those decisions into what we build. When a decision changes, change the plan doc first, then this file.

UXGate (uxgate.org) is a bilingual, practice-first platform where junior and working UI/UX designers in Arabic-speaking countries learn by making real design decisions in 5 to 10 minute lessons. It starts with UX and is built so other tech fields can use the same engine later.

## 1. Scope

### First release (private beta)

The full core loop for Path 1 *Forms That Flow* and Path 10 *Visual Hierarchy in Action*, plus at least one hybrid path with video clips once it is approved as the model:

guest sample lesson → sign up → onboarding → path map → lessons and skill checks → feedback → progress, streak and review → subscribe (test mode) → certificate.

Plus the full admin panel (section 6), because admins run content, support and billing from day one.

### Not in the first release

- Learner-facing AI, social features, comments or forums.
- Open-ended work (free text answers, file uploads).
- Accounts for minors.
- Native mobile apps. The web app is mobile first and installable (PWA).

## 2. Principles

1. **Practice first.** Every lesson is decisions, not reading. The learning model in [learning-model.md](../learning-model.md) is binding.
2. **Never lose work.** Answers save as they happen. Some downtime is acceptable; lost attempts are not.
3. **Arabic is first-class.** One switch changes interface and content. RTL is designed, not mirrored after the fact.
4. **Calm motivation.** XP, goals, streaks and badges reward independent answers. No hearts, energy, timers on thinking steps, paid streak repairs or loss-framed warnings.
5. **Accessible by default.** WCAG 2.2 AA, every step works on a phone and with a keyboard, no drag-only interactions.
6. **Admins control everything** except new step types, which are added in code.

## 3. Users and roles

| Role | Who | Can |
| --- | --- | --- |
| Guest | Anyone on uxgate.org | Read public pages, play one sample lesson |
| Free learner | Signed up, no subscription | Unit 1 of every path, review, profile, settings |
| Subscriber | Active subscription | All units, certificates |
| Owner | Admin | Everything, including admin roles and billing settings |
| Content editor | Admin | Content, media, content quality |
| Support agent | Admin | Learner lookup, appeals, refunds within the rules, emails |

Every admin action is written to the audit log.

## 4. Learner features

Each feature lists its acceptance checks. UI rules (U01–U60) come from the UI/UX design reference.

### 4.1 Public site and guest lesson

- Landing page in both languages with the value proposition, path catalogue, price in local currency, FAQ and sign-up.
- Path pages (public, indexable) list units and skills.
- A guest can play one sample lesson without an account. Their answers are kept on the device and attached to the account if they sign up within the session.
- **Done when:** a guest finishes the sample lesson on a 360 px wide phone in either language and lands on sign-up with their result kept.

### 4.2 Accounts

- Sign up and sign in with email and password, email link, Google, or Apple.
- Display name, interface language, theme (system, light, dark), daily goal and reminder time.
- Settings: download my data (JSON), delete my account (personal data removed within 30 days), notification choices, achievement page on or off.
- **Done when:** all four sign-in methods work, a password reset email arrives through Resend, and delete schedules removal and signs the learner out.

### 4.3 Onboarding

- Three questions: goal, experience level, weekly time. Recommends a path and explains why; the learner can pick any path.
- Sets a daily goal (1, 2 or 3 lessons) and a time cue.
- **Done when:** onboarding takes under a minute and can be skipped.

### 4.4 Home and path map

- Home shows the next lesson as the dominant action (U01), today's goal, streak, review due, and the current path.
- The path map shows units in order with their skills, lesson states (locked, available, in progress, done) and skill states (Practiced, Shown, Kept). Unlocking is skill based: a unit opens when the previous unit's skill check is passed or the learner tests out.
- Locked paid units explain why and what unlocks them (U26).
- **Done when:** the map is readable at 360 px, works with a keyboard and a screen reader, and shows the same state in both languages.

### 4.5 Lesson player

- All step types: card, choose (with reason), predict, words, fix, tune (live preview), sort, order, match, spot, compare, and video.
- Selecting never shows correctness; only Check does (U25). Wrong answers show the matching misconception message, up to 2 hints, then "Show the answer" after 3 tries. The first attempt is kept.
- Confidence tap on about 2 steps per lesson.
- Skill checks: new scenario, no hints, no per-step verdict, summary at the end.
- End-of-unit mastery round: every skill missed in the unit comes back with a fresh variant until it is right or the variants run out.
- Video steps: Bunny Stream player with English and Arabic captions, a transcript, and no autoplay with sound.
- Lesson end: recap, XP earned, skill progress, next lesson.
- Exit at any time; progress resumes at the same step.
- **Done when:** every step type passes the keyboard, screen-reader and 360 px checks, and killing the network mid-lesson loses no committed answer.

### 4.6 Progress and motivation

- XP: 10 independent, 5 supported, 0 revealed.
- Daily goal and streak, with up to 2 freezes earned by meeting the goal on extra days.
- Skill badges when a skill becomes Shown and Kept.
- Spaced review: a queue of skills to re-check, confident errors first, from 3 days after Shown.
- Weekly leaderboards: off until the learner opts in. Feature flag in admin.
- **Done when:** a learner can see why each number changed.

### 4.7 Certificate and achievement page

- A path certificate when all units' skills are Shown.
- Public achievement page at `uxgate.org/u/<handle>`, off by default, showing display name, path, skills passed and date only.

### 4.8 Subscription

- One monthly plan, one base price ($5 to $10, final price set by admins) shown in local currency.
- Working assumption: **Paymob** for learners paying from Egypt, **Paddle** for everyone else. Provider is chosen by billing country; the rest of the app only sees an entitlement.
- No trial, cancel anytime (access lasts to the period end), refund within 7 days of a charge.
- **Done when:** test-mode subscribe, renew, cancel, refund and failed payment all update the entitlement through webhooks, and the learner gets the right email for each.

### 4.9 Notifications

- In-app inbox, email (Resend), and browser push. Each kind can be turned off.
- Kinds: daily reminder, review due, streak at risk (once, not loss framed), badge earned, billing events, appeal answered.

### 4.10 Appeals and support

- On any graded step the learner can ask for human review with a written reason. Support answers in the admin panel; an accepted appeal re-scores the attempt.
- Support by email (support@uxgate.org), linked from every page footer and from settings.

## 5. Content

- Content is authored as YAML in `content/paths/` ([content-format.md](../content-format.md)) and reviewed one unit per PR with a playable preview.
- At build time the YAML compiles to versioned JSON bundles. Each published lesson has a content version; attempts store the version they were played on.
- Later, the admin panel edits content directly (section 6.1) and the same validator runs on save.
- Paths can be **interactive** or **hybrid** (with video steps). The path record says which.

## 6. Admin panel

Lives at `uxgate.org/admin`, desktop first but usable on a tablet, English interface with Arabic content side by side.

| Area | First release | Later |
| --- | --- | --- |
| 6.1 Content | Browse path → unit → skill → lesson → step → variants; preview any lesson in both languages; publish a content version; edit text fields and misconception messages with validation | Full structural editing, drafts and review states |
| 6.2 Media | Upload clips to Bunny Stream, attach .vtt captions in both languages, see where each clip is used | Image library |
| 6.3 Content quality | Per step and variant: attempts, first-try success, hint use, reveal rate, common wrong answers, weak-question flags | A/B variants |
| 6.4 Learners and support | Search by email or name; account, progress, attempts, subscription, emails sent; reset progress, restore streak, grant access; answer appeals | Bulk messages |
| 6.5 Subscriptions and payments | Prices per currency, free-tier rules, payment history, cancel and refund within the 7-day rule | Coupons |
| 6.6 Platform settings | Feature flags (leaderboards, push, video), notification and email templates in both languages, goal and streak rules | Experiments |
| 6.7 Reports | Sign-ups, active learners, lesson completion, paying learners, correction and transfer rates | Cohorts |
| 6.8 Admin access | Invite admins, assign roles, audit log of every admin action | SSO |

## 7. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | Lesson step change under 100 ms on a mid-range Android phone; first load of a lesson under 2.5 s on 4G (LCP) |
| Reliability | Answers saved locally first, then synced with retries; nothing is lost if the tab closes |
| Accessibility | WCAG 2.2 AA; automated axe checks in CI plus the manual checklist before each release |
| Security | Row-level security on every learner table; admin routes checked server side; webhooks verified by signature; secrets only in Vercel and Supabase |
| Privacy | Data rules from the plan doc; no advertising trackers; analytics without third-party cookies |
| Localization | English and Arabic for every string; Arabic digits optional per learner; dates and currency through `Intl` |
| Scale | 1,000 to 10,000 users in year 1 on the stated budget |
| Cost | Under $100 a month running cost before payment fees |

## 8. Success measures for the beta

Measured in the admin reports; targets are set after the beta from real results.

- Activation: guests who finish the sample lesson and sign up.
- Learning: correction rate (wrong then right on revision) and transfer rate (independent success on a new case).
- Habit: learners active on 3 or more days in their first week.
- Revenue: free learners who subscribe within 14 days.
