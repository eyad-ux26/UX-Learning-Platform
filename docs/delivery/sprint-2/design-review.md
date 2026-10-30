# Slice 2 design review (PM)

30 October 2026. Reviewed: canvas v24 (https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx), page "6 · Slice 2 · Lesson player", and draft PR #35 (`docs/design/slice-2/`, `uxgate.css` block `.ug.lp`), against [design-brief.md](design-brief.md).

## Verdict

**Ready to approve after two small fixes.** All 12 deliverables are there, each one in mobile and desktop, EN light and AR night. The step types, feedback states and offline states are complete. The concept card matches the real content format (title, body, icon rows).

## Deliverables

| # | Deliverable | Status |
| --- | --- | --- |
| 1 | Remaining step types (predict graded and try-first, words, fix, sort, order, match, spot, choose with reason) | ✓ Each one selected, wrong with hint, and right; spot has a list fallback; sort works by tapping |
| 2 | Video step | ✓ EN and AR captions, transcript, no autoplay, replay, night stage with the white mark |
| 3 | Concept card | ✓ Uses the P01 U01 L01 S03 text |
| 4 | Feedback variants | ✓ with fix 1 |
| 5 | Confidence tap | ✓ Plus "You were sure" review priority |
| 6 | Skill check | ✓ No hints, no per-step verdict, summary |
| 7 | Mastery round | ✓ Plus a page for when nothing was missed |
| 8 | Exit and resume | ✓ |
| 9 | Saving and offline | ✓ |
| 10 | Guest sample lesson | ✓ |
| 11 | Ask for human review | ✓ Four reasons, a 280-character note |
| 12 | Illustrations | ✓ From the UXGate set |

## Fixes before approval

1. **Show the answer timing.** `LessonKinds` shows "Show the answer" from the second wrong try (`canReveal: tries >= 2`). The spec (§4.4) and the learning model say it comes after 3 wrong tries: hint 1 after the first, hint 2 after the second, and Show the answer after the third. Change it to `tries >= 3` and fix the README line that says "from the second try".
2. **Landing FAQ fit.** The five FAQs sit on fixed-height landing boards and were not rendered to check. Render `ScreenLanding` and `DeskLanding` in EN and AR and confirm that nothing is clipped. Arabic runs longer.

## Notes for the build (slice 2, sprint 3)

- The hints are now real in all 7 authored units. Use the content branches, not the sample hints.
- The icon map from the Phosphor names and the illustration sizes (100 px on mobile, 200 px on desktop) are in `docs/design/slice-2/README.md`.
