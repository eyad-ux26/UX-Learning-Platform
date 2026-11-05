# Slice 2 build brief: full lesson player

For the **Build slice 2** thread (a new thread). Written by the PM thread, 2 November 2026, after Eyad approved the slice 2 design. Build in sprint 3, on top of slice 1 (PR #36). Start when PR #36 has passed the slice 1 verify.

## Goal

Every lesson in P01 and P10 plays from start to end, with every step type, the skill check and the end-of-unit mastery round. A guest can play the sample lesson and keep the result when signing up. Nothing a learner answers is ever lost, even offline.

## Sources of truth (read first)

| What | Where |
| --- | --- |
| Approved design | Canvas https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx v39, page "6 · Slice 2 · Lesson player", plus the Sprint 1 pages for scenario characters and the reminder picker |
| Design files | PR #35: `docs/design/slice-2/` (README with icon map and illustration sizes), `docs/design/system/uxgate.css` (`.ug.lp`, `.say`, `.scn`, `.rem`, `.tp`), `docs/design/system/characters/` |
| Review notes | [design-review.md](design-review.md) (rounds 1 and 2; what Eyad kept as designed) |
| Product rules | `docs/product/spec.md` §4.4, §4.5, §4.6 (replay rule), `docs/learning-model.md` |
| Stories | `docs/delivery/user-stories.md` |
| Content | Branches `content/p01-u01`, `content/p01-u02`, `content/p10-u01` … `content/p10-u05` (with `speaker:`, hints and re-test banks B01); format in `docs/content-format.md`; `preview/player.html` is the reference behaviour |
| Done rules | `docs/delivery/definition-of-done.md` (including the tech gate) |
| Credits | `/mnt/project-files/delivery/credits-policy.md`: build on Sonnet high; switch to Opus only after being stuck twice on the same problem |

The approved canvas wins for looks, the spec and learning model for behaviour. Ask the PM thread when unsure.

## In scope

| ID | Story | Notes |
| --- | --- | --- |
| EN-07 (rest) | Player core | Step types predict (graded only), words, fix, choose with reason; confidence tap; exit confirmation (sheet on mobile, dialog on desktop, only after the first answer) |
| EN-08 | More step types | sort (tap to place), order (move up and down), match (tap to pair), spot (tap area plus list fallback) |
| — | Concept card and feedback | Concept card; "Also works"; misconception message; hint 1, hint 2, Show the answer after 3 tries with worked reasoning; "Why?" |
| EN-12 | Skill check and mastery round | Skill check: new case, no hints, no per-step verdict, summary. Mastery round: every missed skill comes back with a fresh variant from the B01 bank; the "nothing missed" page. Skill states Practiced → Shown by the learning model (Kept comes with review in slice 3) |
| EN-14 | Video step | Bunny Stream with signed URLs, EN and AR captions, transcript, no autoplay with sound, replay. Use one test clip until P14 clips are ready; ask Eyad for the Bunny account when you reach it |
| EN-10 | Guest sample lesson | Entry from landing, play as guest with answers on the device, result, hand-off to sign up that attaches the answers |
| EN-09 (rest) | Saving and offline | Saving, saved, offline banner and sync done states inside a lesson |
| — | Ask for human review | Entry point on a graded step and the reason form (4 reasons, 280-character note); store it for the admin side |
| #42 | HttpOnly session cookies | Move sign-in, sign-up, Google OAuth start and callback, and the email link to server actions and route handlers so the session cookies are HttpOnly (beta gate item) |
| — | Content | Compile and seed all P01 and P10 units, including the B01 banks |

## Out of scope

Streak freezes, badges, review queue, Kept, profile design, Paths tab and multi-path screens, certificates (slice 3). Settings, notifications, Apple, public pages (slice 4). Payments (slice 5).

## Acceptance checks (the verify thread runs these)

1. Every step type works selected, wrong with hints, Show the answer after the 3rd try, and right, in EN light and AR night, at 360 px and 1440 px, with keyboard only and a screen reader.
2. Selecting never shows right or wrong; only Check does. The first attempt is the one kept.
3. A skill check shows no hints and no per-step verdict, and its summary matches the stored attempts.
4. Missing a skill in the unit brings it back in the mastery round with a variant the learner hasn't seen; mastery XP follows the 10 / 5 / 0 rule.
5. Closing a lesson after the first answer asks for confirmation; before any answer it leaves at once; Esc and back close the confirmation.
6. The video step never autoplays with sound, and captions and transcript work in both languages.
7. A guest plays the sample lesson, signs up, and the result appears on the new account.
8. Network off for 3 steps, then on: nothing is lost, and the offline and sync states show as designed.
9. Session cookies are HttpOnly and Secure; Google, email and password, and the email link still work in both languages.
10. Replays follow spec §4.6.
11. Every screen matches canvas v39; axe shows no serious issues; step change under 100 ms on a mid-range Android phone; the tech gate passes.
12. CI is green and the PR has a Vercel preview link.

## How to work

- Branch `build/slice-2` from `build/slice-1`, one PR, commits per story, the PR body lists each story with its checks ticked.
- Post the preview link when checks 1–12 pass, then stop for the verify thread. Fix every `bug` + `slice-2` issue on the same PR.
- Do not merge. Eyad merges after the gate.
