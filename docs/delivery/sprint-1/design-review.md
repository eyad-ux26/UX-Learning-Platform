# Sprint 1 design review (PM)

30 October 2026. Reviewed: the design canvas (https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx), draft PR #34 (tokens, stylesheet, white mark, sounds) and the design thread's report, against the Sprint 1 stories (DS-01 to DS-05, DS-09).

## Verdict

**Approved by Eyad on 30 October 2026.** The three blocking fixes below were done in canvas v23 and PR #34 (commits 88fdcfb, c602622, ed918e3) and re-checked by the PM thread on 30 October 2026: the selected line is now #1677C0 (4.74:1 on surface in light, 7.05:1 in night, 4.18:1 on the selected background); `uxgate.css` ends with a `prefers-reduced-motion` block; tune and compare are on the canvas (Mobile 6d and 6e, Desktop D6d and D6e) with images in `docs/design/steps/`.

Original verdict before the fixes: **ready to approve after three fixes.** All five design stories are delivered, plus extras Eyad asked for: desktop versions of every screen, 27 original sound effects with a CC0 licence, and a clickable flow with device, language, theme and sound switches. Contrast is measured in `tokens.json` and almost every pair passes. Two accessibility gaps must be fixed before the build starts, because the build copies the stylesheet, and two step types are missing that the first real unit needs.

## Story check

| Story | Status | Notes |
| --- | --- | --- |
| DS-01 Brand applied | ✓ | Original logo, white mark for night grounds, brand palette, Cairo and Titillium Web, voice page, app screen next to a brand post |
| DS-02 Tokens | ✓ with fix 1 | JSON and CSS with the same `--ug-*` names, light and night, contrast table |
| DS-03 Core components | ✓ with fix 2 | Ledge surfaces, all states, LTR and RTL |
| DS-04 Learning components | ✓ | Choices, Check, feedback, teaching cards, motivation parts |
| DS-05 Key screens | ✓ | 7 screens, mobile and desktop, EN light and AR night, clickable flow |
| DS-09 Logo motion and illustrations | Open | Needs Eyad's review; illustrations are not yet used on the boards |

## Fixes before the build (blocking)

1. **Selected frame contrast.** `selected-line` on `surface` is 2.04:1 in light. A selected answer is a state, so its outline needs 3:1 (WCAG 1.4.11). Darken the light value (for example #1677C0 gives 4.7:1 on white) or make the corner handles carry the 3:1.
2. **Reduced motion.** `uxgate.css` has no `prefers-reduced-motion` rules. The snap, ledge press, bounces and reward motion need a reduced version (instant or fade) (U53).
3. **Tune and compare steps.** The first real units (P01 U01 and P10 U01) are built from card, tune and compare steps; Sprint 1 designed choose only. Add a **tune** step (try options, live preview of the mock screen, Check) and a **compare** step (two mock screens, pick the better one, then the deciding reason), each selected, wrong and right, mobile and desktop, EN light and AR night. Without them the build cannot play a real lesson.

## Fixes in sprint 2 design (not blocking)

4. **Illustrations.** Use the UXGate illustration set on lesson end, empty states, onboarding and the path map intro, so the playful layer is consistent (handoff 05).
5. **Placeholders.** `[PRICE]` waits for Eyad's price (needed by slice 5). The second hint, the FAQ answers and the Arabic skill-state labels are now written in [sprint-2/design-brief.md](../sprint-2/design-brief.md).

## Content gap found

P01 U01 L01–L03 have no `hints` on any graded step (and most other units have none either), so the canvas shows sample hints. The content thread is writing up to 2 hints (EN and AR) for every graded lesson step; skill checks stay without hints. The build seeds marked placeholders until then.

## Decisions for Eyad

- **Sound on by default?** Decided by Eyad on 30 Oct: yes, as recommended. The UI rules (U54) say no sound unless the learner turns it on. Eyad wants sound throughout. Recommendation: on by default for lessons, with a mute button in the lesson header and in settings, nothing plays before the learner's first tap, and the choice is remembered.
- **Arabic skill-state labels:** Approved by Eyad on 30 Oct. Practiced تدرّبت, Shown أثبتّ, Kept أتقنت. Kept means the skill stayed after review, and أتقنت reads more naturally than حافظت.
