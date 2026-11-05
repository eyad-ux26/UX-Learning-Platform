# Design audit fixes (canvas v60, 4 November 2026)

The design audit of canvas v58 found 16 issues. Admins approved fixing all of them, plus the follow-ups on lesson player scrolling and weekday labels. This page lists what changed and what the builds must copy. Each ID matches the audit.

Canvas: https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx (version 60)

## Builds: copy these

| ID | What the build does |
|---|---|
| A1 | Set link colour once: `:where(.ug) a { color: var(--link); }` (in `system/uxgate.css`). Remove every hard-coded `a { color: #005F99 }`. On night screens, links must use `#4CC3E8`. |
| A6 | Never fade an option with `opacity`. `.choice.is-dim` now uses the surface-2 fill, a line border and text-2. Text stays readable. |
| A8 | No text below 12px anywhere. This includes bottom tab labels, the speaker name, the PRO tag and the labels inside the example mocks. |
| L1 | Size the lesson player with `100dvh`, not a fixed 844px. Test it at 390 × 664 and 360 × 640. |
| L2 | On steps that ask for confidence, Check becomes one primary split button: Guessing \| Fairly sure \| Sure (`.split-check` and `.split-seg`). It is one filled bar with one ledge, the same size as Check, with thin dividers. The three segments are equal in size and colour, so none looks like the right answer. Each segment is a real button, 44px or taller, that submits, with an accessible name like "Check, sure" («تحقّق، متأكد»). The label above it says "Check: how sure are you?" («تحقّق: ما مدى ثقتك؟»). Before an answer is picked, the whole bar is disabled and says "Pick an answer first." («اختر إجابة أولًا.»). On press, the whole bar sinks once and the tapped segment darkens. In RTL the order mirrors, so Guessing sits at the start (right). Remove the separate confidence row. Steps without confidence keep Check. |
| L3 | Show the full scenario bubble only on the first step of a case. Later steps show a one-line speaker chip, and a tap opens the full text. |
| L4 | On a phone, the example is a pinned thumbnail (about 112px tall) next to the question. A tap opens it full screen at a readable size, with pinch zoom. Spot keeps the example inline, because the answer is tapped there. |
| L5 | `.lp-main` scrolls and `.lp-bar` is `position: sticky; bottom: 0`. The last option fades under the footer, and no option hides behind it. Once an answer is picked, scroll the footer into view. |
| U4 | Next to a disabled Check, say what is missing: "Pick an answer, then Check.", "3 of 5 placed" or "2 of 4 paired". |

New `LessonKinds` props: `screen` (844, 664, 640), `caseStep` (first, later) and `example` (thumb, full). `state` also has a new `press` value, which shows the pressed split button.

Update (5 November 2026, canvas v63): L2 is now the split button described above. See board S2-5 and the "Confidence is the Check" part of the Choices, Check and feedback component board.

## Other fixes on the canvas

- **A2:** example mocks use labels of 12px or more on mobile, and the full-screen view uses the desktop size.
- **A3:** statuses such as Not started, In review, Paused, Locked and After 2 lessons use text-2 on the disabled fill (5.97:1). There is also a new `.status-chip`. Disabled tokens are for disabled controls only.
- **A4:** the certificate eyebrow is brand blue `#005F99`.
- **A5:** the green cursor tag uses navy text on `#3DAA80`.
- **A7:** these are now 44px or taller: settings segmented controls, header stat chips, "All paths", the home streak row, slice 1 confidence chips, the lesson page segmented control, and the receipt download button. Standalone text links get a 44px hit area with `a.hit`. Their visual size stays the same.
- **U1:** form errors in EN and AR. New boards: S4-12 (sign up, sign in and password reset) and S5-12 (discount code, student email and refund reason).
  - The message sits under the field.
  - The field gets `aria-invalid` and `aria-describedby`.
  - Focus moves to the first field in error.
  - The value the learner typed stays in the field.
  - Sign in never says which of the two fields is wrong.
  - Problems that aren't tied to a field (expired link, too many tries) use one alert at the top.
  - New props: `SystemPages error` (email, taken, short, wrong, link, tooMany), `CheckoutPages error` (codeInvalid, codeExpired, codeRegion, studentEmail) and `BillingPages error` (refundEmpty).
- **U2:** onboarding question 3 no longer asks for time each week. The daily goal is the only choice.
- **U3 and weekdays:**
  - Each language has one week start: English starts on Monday, Arabic on Saturday. Arabic is an assumption until the PM confirms.
  - Day names are short: Sat · Sun · Mon · Tue · Wed · Thu · Fri, and سبت · أحد · اثنين · ثلاثاء · أربعاء · خميس · جمعة.
  - Today shows as Today / «اليوم».
  - Each day's accessible name gives the full day name and its state, for example "Tuesday, freeze used".
  - The Arabic freeze rule now reads «من السبت إلى الجمعة», and the Arabic weekly leaderboard ends on Friday night.
- **U5:** badge names wrap to 3 lines.
- **P1:** the slice 1 lesson step, tune and compare boards are marked "Replaced". Build from the slice 2 player.
- **P2:** the settings reminder switch sits at the trailing edge, with the time field under the label.
- **P3:** the landing lesson preview letters its two options A and B.
