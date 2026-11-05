# Slice 3 design review (PM)

2 November 2026. Reviewed: canvas v40 (https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx), page "7 · Slice 3 · Progress", and draft PR #53 (`docs/design/slice-3/`, the "Slice 3" blocks in `uxgate.css`), against [design-brief.md](design-brief.md). This round checked rules and copy in the component sources; it was not a pixel render.

## Verdict

**Approved by Eyad on 2 November 2026** (canvas v48, draft PR #56, which replaces #53). v48 also renames the onboarding "We suggest" card to "Your starting path" («مسار بدايتك») on the slice 1 onboarding pages. Build brief: [build-brief.md](build-brief.md).

**Ready for Eyad's approval.** The fix below was done in canvas v42 and PR #53 (22184da): a new "Streak detail · holding 2" frame and matching dialog copy. Before the fix, the verdict was ready after one small fix. All 13 deliverables are present, each in mobile 390 and desktop 1440, EN light and AR night. Every rule in spec §4.4b and §4.6 checks out: joined paths come first, Coming soon paths are disabled, the resume card names its path, review mixes paths, the replay copy matches, and the freeze copy matches the approved rule. The profile reminder reuses the onboarding picker code. There's no loss-framed copy, and nothing is sold.

## Fix

1. **Freeze at the maximum.** The streak detail always shows "Your next freeze" with progress toward it. When the learner already holds 2, the screen needs a state that says they hold the most and that goal days this week won't add a third. The earned-freeze dialog that reaches 2 should say this too.

## Assumptions, accepted

- 14 paths is right: P14 Patterns That Fit is the hybrid path. Spec §4.4b, EN-11b and the brief are updated from 13 to 14.
- Learner Yasmin, not Nour, because Nour is a cast member.
- Skill totals (P01 40, P10 35) and P10 progress are sample data. The build takes the real numbers from the compiled content.
