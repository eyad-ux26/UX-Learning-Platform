# Slice 1 build brief: core loop

For the **Build slice 1** thread. Written by the PM thread, 30 October 2026. Build in sprint 2 (5 to 11 November); you may start as soon as Eyad approves the Sprint 1 design.

## Goal

A learner can open uxgate.org on a phone or a laptop, in English or Arabic, light or dark. From there they can:

- sign up
- answer onboarding
- see home and the path map
- play the first three lessons of P01 Unit 1 with real feedback
- finish on the lesson end screen

All of it runs on a Vercel preview with real accounts and saved progress.

## Sources of truth (read first)

| What | Where |
| --- | --- |
| Approved design (screens, states, flow) | Design canvas https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx |
| Tokens, stylesheet, white logo mark, sounds | PR #34 (`docs/design/system/tokens.json`, `tokens.css`, `uxgate.css`, `docs/design/logos/`, `docs/design/sound/`) |
| Product rules | `docs/product/spec.md` §4.1–4.6, `docs/learning-model.md` |
| Architecture and data model | `docs/tech/architecture.md`, `docs/tech/data-model.md` (PR #9) |
| Stories and checks | `docs/delivery/user-stories.md` (PR #9) |
| Content | P01 Unit 1 YAML on branch `content/p01-u01` (`content/paths/P01/`), format in `docs/content-format.md`; `preview/player.html` is the reference behaviour for every step type |
| Done rules | `docs/delivery/definition-of-done.md` |
| Copy | Design canvas and `docs/design/handoff/04-screens-and-copy.md` |

If two sources disagree, the approved canvas wins for looks, the spec and learning model win for behaviour. Ask the PM thread when unsure; do not guess silently.

## In scope

| ID | Story | Notes for this slice |
| --- | --- | --- |
| EN-01 | App skeleton | Monorepo layout from the architecture doc, Next.js App Router, TypeScript, `next-intl` with `/en` and `/ar` (Arabic `dir="rtl"`), theme switch (system, light, dark), `packages/tokens` generated from `tokens.json`, Tailwind reading the CSS variables, lint rule against physical CSS properties, CI (typecheck, lint, unit tests, content validate), Vercel preview per PR |
| EN-02 | Supabase | Staging project; migrations in the repo; RLS on every learner table with a test proving one learner cannot read another's rows |
| EN-03 | Sign up and sign in | Email and password, email sign-in link, Google. Resend emails in the learner's language. Apple moves to slice 4 |
| EN-04 | Onboarding and profile | The 3 questions as designed, skippable, path suggestion, daily goal and reminder time saved |
| EN-05 | Landing | The designed landing page only (path pages are slice 4). `[PRICE]` stays a placeholder |
| EN-06 | Content compiler | YAML → validated JSON bundles in `content_versions`; load P01 U01 lessons L01–L03 (copy the files from `content/p01-u01` into a seed folder until content merges) |
| EN-07 | Lesson player (part) | Step types **card, choose, tune, compare**; select → Check → feedback; hints after a wrong answer; Show the answer after 3 tries; first answer kept; exit and resume at the same step |
| EN-09 | Answers never lost | Attempts queue in IndexedDB, sync with retries to `POST /api/attempts`, server scores and stores with the content version |
| EN-11 | Home and path map (basic) | Next lesson as the main action, path map with lesson states (locked, available, in progress, done); skill states show Practiced only |
| EN-13 | XP and goal (part) | XP 10 / 5 / 0 per independent, supported and revealed answer; today's goal count; streak shows the day count only (freezes are slice 3) |
| — | Sound | The 27 sounds from `docs/design/sound/` mapped as in its README; mute in the lesson header and remembered; nothing plays before the first tap; see the open decision on the default |

## Out of scope (later slices)

Other step types, skill check and mastery round, guest sample lesson, video step (slice 2). Streak freezes, badges, review, profile, certificate (slice 3). Settings, notifications, Apple, path pages, system pages (slice 4). Payments (slice 5). Admin panel (waterfall).

## Acceptance checks (the verify thread runs these)

1. A new visitor on a 360 px phone signs up with email and password in Arabic, completes onboarding, and lands on home with the suggested path. The same works in English on a 1440 px laptop.
2. Google sign-in and the email sign-in link both work; each email arrives in the learner's language.
3. The learner plays P01 U01 L01 to the end. Selecting never shows right or wrong, only Check does; wrong answers show the matching feedback, hints and then Show the answer.
4. Turning the network off mid-lesson and answering 3 more steps loses nothing: after reconnecting, all attempts are on the server with the right content version.
5. Closing the tab mid-lesson and reopening resumes at the same step.
6. Lesson end shows XP earned and first-try count matching the attempts.
7. Home and path map show the updated lesson states and today's goal count.
8. Every screen matches the canvas in EN light and AR night, mobile and desktop. Keyboard-only play works, and axe shows no serious issues.
9. A second learner cannot read the first learner's attempts through the API or Supabase (RLS test passes in CI).
10. CI is green and the PR has a Vercel preview link.

## Accounts and keys Eyad provides

Vercel (connected to the GitHub repo), Supabase (staging project), Google OAuth client, Resend (with uxgate.org DNS records), Sentry. Ask for each one only when you reach the step that needs it, and say exactly where it goes (environment secret name). Never commit secrets.

## How to work

- Branch `build/slice-1`, one PR to `main`, commits per story, PR body lists each story with its checks ticked.
- Post the preview link in your thread when checks 1–10 pass on it, then stop for the verify thread. Fix every `bug` + `slice-1` issue it files on the same PR.
- Do not merge. Eyad merges after the gate.
