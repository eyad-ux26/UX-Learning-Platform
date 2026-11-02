# Slice 3 design brief: progress, motivation and several paths

For the **Design** thread (a fresh thread for slice 3, started from the handoff). Written by the PM thread, 2 November 2026, after Eyad approved the slice 2 design. Design in sprint 3; build follows in sprint 4.

Slice 3 is everything that brings a learner back and shows their progress, and the move from one path to many.

## Before you start

Slice 2 was approved by Eyad on 2 November 2026 (canvas v39, PR #35). Keep building on the same canvas and design system. Add a new page, "7 · Slice 3 · Progress".

## Deliver

All in mobile (390) and desktop (1440), EN light and AR night, using the existing design system unless something new is needed.

| # | Screen or state | What to show | Rules |
| --- | --- | --- | --- |
| 1 | **Paths tab** | All 13 paths: name, subtitle, interactive or hybrid, unit count, my progress; joined paths first; "Coming soon" paths that can't be started | Spec §4.4b, EN-11b |
| 2 | **Path detail and choosing** | Opening a path shows its map; "Start this path" and "Continue"; confirmation that progress on other paths is kept | §4.4b |
| 3 | **Home with several paths** | Next lesson in the current path with its name; "Your paths" row with progress and one-tap switch; resume card naming its path; review due from all paths; streak and goal | §4.4b, EN-11 |
| 4 | **Path map switcher** | Header switcher; locked units say why and how to unlock | EN-11 |
| 5 | **Onboarding changes** | Recommendation only from paths with content and why; "See all paths" (same list as the Paths tab); guest sign-up with P01 preselected | §4.4b |
| 6 | **Lesson end variants** | Next lesson in the same path; end of a path suggests a next path; replay ("Replay: half XP"); a skill reaching Shown; a badge earned | §4.6 |
| 7 | **Streak and freezes** | Streak detail; a freeze earned (goal met on 5 days in a week, max 2 held); the calm note "A freeze kept your streak" the day after; no loss-framed copy anywhere | §4.6, EN-13 |
| 8 | **Skill states and badges** | Practiced, Shown, Kept (تدرّبت · أثبتّ · أتقنت) on the path map and profile; badge gallery; each number explains why it changed | EN-13 |
| 9 | **Review** | Review queue (confident errors first, each card shows its path), review session with new scenarios, review done; empty state | EN-20 |
| 10 | **Profile** | Totals across paths, one card per joined path, certificates per path, reminder settings reusing the onboarding time picker (`.rem`, `.tp`); replaces the temporary profile in the slice 1 build | §4.4b |
| 11 | **Certificate and public page** | Certificate per path when all its skills are Shown; public achievement page (off by default; name, path, skills, date only); share and turn-off | EN-21 |
| 12 | **Opt-in leaderboard** | Off by default; the opt-in screen; weekly XP from all paths; leaving it | EN-23 |
| 13 | **Illustrations and sound** | UXGate illustrations on streak, freeze, badge, certificate and empty states; map the existing sounds to new moments (no new sound files unless needed) | handoff 05 |

## Copy

Write EN and AR together (simple MSA, English UX terms kept with a short explanation). Scenario characters stay as in slice 2 where a screen shows a question.

## Credits

Follow `/mnt/project-files/delivery/credits-policy.md`: new screens on Opus high. Republish the canvas at milestones, and take feedback in one batched message per review.

## Gate

Post the canvas link and update the design PR when done. The PM thread reviews against this list, then Eyad approves.
