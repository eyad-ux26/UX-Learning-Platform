# Slice 4 design review (PM)

2 November 2026. Reviewed: canvas v51 (https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx), page "8 · Slice 4 · Account and public", and draft PR #67 (`docs/design/slice-4/`, stacked on #56), against [design-brief.md](design-brief.md). This round checked scope and product rules from the design thread's report and README. It did not include a pixel render.

## Verdict

**Approved by Eyad on 3 November 2026** (canvas v53, draft PR #67). The privacy and terms text isn't approved yet; Eyad is revising it at https://claude.ai/artifact/7J7vyELaFbJkptMRc13zBc, so the build uses placeholder legal text until he signs it off. Build brief: [build-brief.md](build-brief.md).

**Ready for Eyad's approval** (canvas v52, PR #67 commit 1d73c60, with calls 5 and 6 and the delete undo copy applied). All 11 brief items are delivered in mobile and desktop, EN light and AR night. The Google button now follows Google's own brand style, which Google requires.

## Product calls on the design's assumptions (PM, 2 Nov)

| # | Assumption | Call |
| --- | --- | --- |
| 1 | Deleting the account can be undone by signing in within 30 days | Yes. The confirmation and the email both say so, with the date. |
| 2 | Deleting stops the subscription from renewing | Yes. There is no further charge, and the refund rules stay as in §4.8. |
| 3 | Billing emails are always on | Yes. They are transactional and can't be turned off. Every other kind can. |
| 4 | The push ask waits until the first lesson ends, and after "Not now" it never asks again on that device | Yes. Push can still be turned on later from settings. |
| 5 | Streak-at-risk email "Today's goal still open", sent once in the evening | It changes: at most one reminder email a day. When the goal isn't met and the streak is 3 days or more, that day's reminder at the learner's chosen time uses the "Today's goal still open" copy. It is never sent as a second email, and never uses loss-framed wording. |
| 6 | Support replies are signed by a named team member | No. Sign them "The UXGate team". Personal names are kept out of the product. |
| 7 | P14 counts are placeholders | Yes. The build reads the real counts from the compiled content. |
| 8 | The sender is hello@uxgate.org | Yes. Replies go to support@uxgate.org. |
| 9 | No "notify me" on Coming soon paths | Yes for the beta. Revisit after the beta. |
| 10 | A bell with a count badge on Home and Profile | Yes. It's part of EN-19 in the slice 4 build. |

## Follow-up

- Slice 1 sign-up boards and the built sign-up page still use the old Google button. The slice 1 build gets a small issue for this.
- PR #67 needs rebasing onto main once #56 merges.
