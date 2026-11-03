# Slice 3 build brief: progress, motivation and several paths

For the **Build slice 3** thread (a new thread). Written by the PM thread, 2 November 2026, after Eyad approved the slice 3 design. Eyad asked to start now, in parallel with the slice 2 build.

## Working in parallel with slice 2

- Branch `build/slice-3` from `build/slice-1`. Merge `build/slice-2` in as it moves, and rebase onto it once slice 2 passes verify.
- Build first what does not depend on the slice 2 lesson player: data and RLS (enrollments, current path, streaks, freezes, review queue, badges, certificates, leaderboard opt-in), the Paths tab and switching, home, the path map switcher, onboarding changes, streak and freezes, profile, certificate and achievement page, leaderboard.
- Build last what reuses the slice 2 player: review sessions and the lesson end variants. Don't fork player code; wait for slice 2's version.
- Talk to "Build slice 2" before touching shared files (player, attempts API, migrations). Number migrations so they don't collide: slice 2 takes the next number and slice 3 starts 10 higher.

## Goal

A learner can join several paths and switch between them. They see the streak, freezes, skill states and badges, and review their skills over time. They get a certificate per path, can share an optional achievement page, and can join an opt-in leaderboard. Every number explains why it changed.

## Sources of truth (read first)

| What | Where |
| --- | --- |
| Approved design | Canvas https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx v48, page "7 · Slice 3 · Progress" (rows plus the moments board), and the components PathsPages, ProgressPages and ProfilePages on "Screen parts" |
| Design files | Draft PR #56: `docs/design/slice-3/` (README lists every view and the sample-data assumptions), the "Slice 3" blocks in `docs/design/system/uxgate.css` |
| Review notes | [design-review.md](design-review.md) |
| Product rules | `docs/product/spec.md` §4.4b (several paths), §4.6 (XP, freezes, replay, review, badges, leaderboard), §4.7 (certificate and achievement page); `docs/learning-model.md` (Practiced → Shown → Kept) |
| Data | `docs/tech/data-model.md` (`profiles.current_path_id`, `enrollments`, `daily_activity`, `streaks`) |
| Stories | EN-11 (rest), EN-11b, EN-13 (rest), EN-20, EN-21, EN-23 in `docs/delivery/user-stories.md` |
| Done rules | `docs/delivery/definition-of-done.md` (including the tech gate) |
| Credits | `/mnt/project-files/delivery/credits-policy.md`: build on Sonnet high; switch to Opus only after being stuck twice on the same problem |

The approved canvas wins for looks, the spec and learning model for behaviour. Ask the PM thread when unsure.

## In scope

| ID | Story | Notes |
| --- | --- | --- |
| EN-11b | Browse and switch paths | Paths tab (14 paths, joined first, Coming soon disabled), path detail with Start and Continue, the started confirmation, switching logged as an event; RLS on `enrollments` |
| EN-11 (rest) | Home and path map | Home follows the current path, "Your paths" row, resume card naming its path, review due from all paths; path map header switcher; locked-unit sheet with conditions and test out |
| — | Onboarding changes | Suggestion only from paths with content, "See all paths", guest sign-up with P01 picked and the sample result kept |
| EN-13 (rest) | Streak, freezes, badges | Freeze rule from spec §4.6, applied by a daily job in the learner's time zone; holding-2 state; "A freeze kept your streak" note; badge at Shown (blue) and Kept (gold); the "why each number changed" view; lesson end variants (next, replay, Shown, badge, end of path) |
| EN-20 | Spaced review | Queue from 3 days after Shown, confident errors first, mixed paths with a path label on each card, review sessions with new cases, Kept on a right answer, back tomorrow on a miss, empty state |
| — | Profile | Replaces the temporary slice 1 profile: totals across paths, a card per joined path, certificates, badges, and the reminder reusing the onboarding time picker code |
| EN-21 | Certificate and achievement page | One certificate per path when all its skills are Shown; public page at `uxgate.org/u/<handle>`, off by default, name, path, skills and date only; turning it off removes it at once |
| EN-23 | Opt-in leaderboard | Off by default and behind an admin flag; weekly XP from all paths, resetting each Monday; names and weekly XP only; leaving keeps everything else |
| — | Moments | Illustrations and existing sounds as mapped on the moments board; calm moments stay silent |

## Out of scope

Settings, notifications and the reminder sending itself, Apple, public path pages, privacy and terms pages (slice 4). Payments and the subscription gate on units (slice 5). Admin (waterfall).

## Acceptance checks (the verify thread runs these)

1. A learner with P01 current starts P10 from the Paths tab. P10 becomes current, P01's progress is unchanged, and both appear in "Your paths" and on the profile.
2. Coming soon paths can't be started from the Paths tab or from onboarding.
3. Meeting the goal on 5 days in one week earns 1 freeze. A learner never holds more than 2. A missed day uses one automatically, and the next visit shows the calm note. Time zones are respected (test a learner in Cairo and one in Riyadh).
4. A replay follows spec §4.6, and the lesson end says "Replay: half XP".
5. Passing a skill check moves skills to Shown and gives the blue badges. A right answer in review 3 or more days later moves the skill to Kept and the badge to gold.
6. The review queue puts confident errors first and labels each card with its path.
7. A certificate appears only when all of a path's skills are Shown. The achievement page is off by default, shows only name, path, skills and date, and returns 404 once turned off.
8. The leaderboard stays hidden until the learner joins, shows weekly XP from all paths, and other learners can't see anyone who hasn't joined.
9. A second learner can't read the first learner's enrollments, streaks, review queue or leaderboard opt-in through the API or Supabase (RLS tests in CI).
10. Every screen matches canvas v48 in EN light and AR night, mobile and desktop. Keyboard-only use works, axe shows no serious issues, and the tech gate passes.
11. CI is green and the PR has a Cloudflare preview link.

## How to work

- One PR, commits per story, the PR body lists each story with its checks ticked.
- Post the preview link when checks 1–11 pass, then stop for the verify thread. Fix every `bug` + `slice-3` issue on the same PR.
- Do not merge. Eyad merges after the gate.
