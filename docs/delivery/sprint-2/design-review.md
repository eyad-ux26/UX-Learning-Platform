# Slice 2 design review (PM)

30 October 2026. Reviewed: canvas v24 (https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx), page "6 · Slice 2 · Lesson player", and draft PR #35 (`docs/design/slice-2/`, `uxgate.css` block `.ug.lp`), against [design-brief.md](design-brief.md).

## Verdict

**Ready for Eyad's approval.** Both fixes were done in canvas v26 and PR #35 and checked by the PM thread: `canReveal` is now `tries >= 3`, and the landing boards were raised after a render showed the FAQ clipped by up to 121 px in Arabic. Before the fixes, the verdict was ready after two small fixes. All 12 deliverables are there, each one in mobile and desktop, EN light and AR night. The step types, feedback states and offline states are complete. The concept card matches the real content format (title, body, icon rows).

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

## Round 2: full visual review (1 November 2026, canvas v33)

Screenshots: https://claude.ai/artifact/MNTp13Ua11fr7PQKKLp5Fg. **Eyad's decision (1 Nov):** apply 1–7 and 10, and drop the ungraded try-first (option A for 5). Leave 8 and 9 as designed. Sent to the design thread as one batch.

Eyad asked for every comment. I rendered all 17 slice 2 rows (mobile EN light and AR night for every state, plus desktop samples) and went through them screen by screen. The local render can't load the canvas's uploaded images, illustrations or icon font, so those weren't checked here.

### Fix before the build

1. **Review form note shows "[object Object]".** The sample note in the textarea is bound so it renders as an object, in both languages. In Arabic the counter reads "280 / 64" because of the right-to-left order. Show the counter left-to-right, or as «64 من 280».
2. **Desktop video step is too tall for 900 px.** The "Nothing plays until you tap" note runs under the bottom bar, and the Transcript button can't be seen. Make the player smaller or let the page scroll above the bar.
3. **Mastery round repeats the lesson's own examples.** It shows the same Hana match step and fix step, labelled "Step 8" and "Step 6", but the intro promises "a new example". Use a different case, such as Nour's clinic, and label the steps "Question 1 of 2".
4. **Mastery XP.** A right answer in the mastery round shows +5 XP. The round has no hints and no retry, so every right answer there is a first try. Recommendation: +10, following the 10 / 5 / 0 rule.

### Sample content that breaks Eyad's lesson rules

The build copies these examples, so they should follow the content rules (memory: learning-platform-content-feedback).

5. **Ungraded try-first** ("How many of these fields do you think the gym needs today?", "Any answer is fine"). Eyad's 28 October rule says openers are graded, with one clearly logical answer, never open guesses. The slice 2 brief asked for this ungraded version, which was a PM mistake. **Decision for Eyad:** drop it, or keep it only as a format option that no lesson uses.
6. **Predict asks what people will do** ("how many people will finish this one?"). Rule: ask what the designer should do or change, never what people will think or predict. Reword it, for example: "Which change will get more people to finish?"
7. **Spot gives the answer away.** The mock already shows a red "Invalid phone number" error under the field that is the answer. Show the problem without the error text, or make the error vague but unmarked.

### Polish

8. **Mixed-language chips.** English screens show "Practiced · تدرّبت", "Shown · أثبتّ" and "Kept · أتقنت". Use one language per screen, unless the mix is meant to teach the Arabic terms.
9. **Desktop sort and order** use the top half of the screen and leave the bottom half empty. Centre the task or make the buckets taller.
10. **Feedback row.** The "Right" frame is a right answer after one hint (+5 XP). Add a first-try right (+10 XP) so the build sees both.

### Fine as designed

- All 9 step types work in both languages and directions, with the mock folding into "Show the example again" after Check.
- Hint 1 and hint 2 appear in order, and "Show the answer" comes after 3 tries.
- The skill check has no verdicts, the summary is clear, and the mastery "nothing to retry" page exists.
- Exit, resume, saving, offline and sync states are clear and calm.
- The guest banner and the sign-up sheet keep the earned XP and the skill.

### Round 2 re-check (1 November 2026, canvas v34)

I re-rendered the changed rows. Fixes 1–7 and 10 are done:
- The review note shows its text, and the Arabic counter reads «64 من 280».
- The desktop video is 16:9, with the transcript beside it, and nothing sits under the bar.
- The mastery round uses Nour's clinic, with "Question 1 of 2" and +10 XP.
- The ungraded try-first is removed, and the guest lesson opens with the graded predict.
- The predict step asks "Which change will get more people to finish the trial form?"
- The spot mock no longer shows the error.
- The feedback row has a first-try Right at +10 XP before Right after a hint at +5 XP.

**Ready for Eyad's approval.**
