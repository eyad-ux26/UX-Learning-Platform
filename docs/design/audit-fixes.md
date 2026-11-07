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

Update (5 November 2026, canvas v66): loading states (S3-12) and the path page main action, Start this path / Continue this path / Review this path (S3-13; wording matches PR #160 since v67). Notes are in `slice-3/README.md`; the CSS is the "Loading" and "Path page main action" blocks at the end of `system/uxgate.css`.

Update (5 November 2026, canvas v69), app changes from PR #164 added to the design:
- **Lesson language button** (board S2-13, `LessonKinds` and `LessonPages` headers): after the step count, before sound. A 44px outlined pill with a ledge (`.lp-lang`). Desktop shows a globe and the other language's name (عربي / English); phones show the short label (عربي / EN). Tapping it switches the whole lesson in place.
- **Saved chip**: under 420px it shows only its cloud icon; the word stays for screen readers.
- **Home**: the "Your paths" chips sit right under the greeting, above the next lesson card (boards S3-2 and the `PathsPages` home views).

Update (5 November 2026, canvas v70): new page "10 · Pre-launch · Coming soon" (PL-1 to PL-3) for uxgate.org. See `prelaunch/README.md`.

Update (5 November 2026, canvas v72): board S2-14, the lesson video summary as cards (`LessonPages` views `summary` and `summaryPoints`, CSS block "Video summary" at the end of `system/uxgate.css`). It replaces the plain text summary.
- **Header:** the clip's name as an overline, the title "Video summary" / «ملخص الفيديو», and a secondary "Watch again" / «شاهد مرة أخرى» button with the clip length. It replays the clip.
- **The idea card:** the summary's intro paragraph, with its bold term kept bold, in a card with a bulb icon.
- **Point cards:** each "- **Title:** text" point becomes a card with an icon tile, a bold title and the text. The icon comes from the step's `icons:` list, one per point. If there is none, fit points use check-circle and "Not…" / «لا…» points use x-circle.
- **Groups:** points that start with "Not" / «لا» go in a "When it doesn't fit" / «متى لا يناسب» group with dashed cards on the wrong-answer tint. The rest go in "When it fits" / «متى يناسب» on mint. A summary with no "Not" points has one "Key points" / «أهم النقاط» group. Each group heading shows a count badge.
- **Layout:** one column on phones. On desktop the two groups sit side by side, and a single "Key points" group shows 3 cards per row. Continue sits at the bottom.

Update (6 November 2026, canvas v73): the Coming soon boards PL-1 to PL-3 now match the build in PR #173. The team signs in through a hidden "Team access" page with one team password (no footer link), "Prices at launch" sits under "What you'll get", Refund policy is in the footer, and there are new "Too many tries" and expired-link states. See `prelaunch/README.md`.

Update (6 November 2026, canvas v74): board S3-14, Eyad's path page edits, plus the landing questions accordion. The CSS is in the "Path page edits" and "Accordion" blocks at the end of `system/uxgate.css`.
- **Side menu paths open and close** (`PathsPages` prop `rail`: closed or open). Every path row in "Your paths" has a caret button after the path link (`.dk-tog`, `aria-expanded`, `aria-controls`, label "Forms That Flow: units" / «وحدات Forms That Flow»). All paths start closed, including the current one. When it's open, the units list sits under the path (`.dk-units`): done units get a green check, the current unit gets a play icon on `--sel-bg` with `aria-current="step"`, and locked units get a lock in `--ink-3`. Each unit links to that unit on the path map. The caret turns 180° in 160 ms (no motion under reduced motion). Remembering what's open per learner is optional.
- **Path selector** (`.sw-btn`): at rest it now has a light fill (`--sel-bg`), a `--sel-line` border and a 3px ledge, so it reads as a button. Hover and open use `--panel`; open presses the ledge down.
- **Path steps are links**: a done or next step on the map is one link that covers the dot and the card (`.map-step`), with a caret at the inline end and a hover border. Its accessible name is the title plus "Continue" or "Replay" («تابع» / «أعد الدرس»). Locked steps and the skill check, while locked, stay plain.
- **Welcome back note** (`LessonKinds overlay=resume`): calm colours (`--panel` with a `--sel-line` border, never the warning yellow), no "Start over" action, and a close icon button (label "Close" / «إغلاق»). It closes by itself after 5 seconds. A 3px line along the bottom shrinks over those 5 seconds (`.lp-banner-timer`, toward the inline start). It pauses while the pointer is on the note or focus is inside it. Under reduced motion the line is hidden, but the note still closes after 5 seconds. Keep `role="status"`. The canvas loops the line so the timing shows; the app runs it once.
- **Sign out in red** (`.btn-signout` on the Settings button): red text, a red-tinted border and ledge, and `--wrong-bg` on hover. Delete account stays the stronger red row.
- **Landing questions accordion** (`FaqAccordion`, with the same markup on the landing boards). Use the new `.acc-*` classes, not `.faq-q` / `.faq-a`. Those belong to the Help page list, and their divider lines leak into the landing today. Each item is one card: an `h3` holding a full-width button (min 60px phones, 68px desktop, padding 20px / 24px) with a 32px round caret tile. The answer has no line above or below it, padding 0 20px 20px (24px on desktop), line height 1.65 and a max of 68ch. Open and close is smooth: the panel animates `grid-template-rows` from 0fr to 1fr over 280 ms `cubic-bezier(.2,.8,.2,1)`, the answer fades in and moves 4px, and the caret turns 180° on the same curve. The open card gets a `--sel-line` border. Keep the answer in the DOM so it can animate (no `hidden`), and put `inert` on a closed panel. One item is open at a time, and the first starts open. There is no motion under reduced motion.

Update (6 November 2026, canvas v76): board S3-15, the second batch of Eyad's edits. `LessonGuide` shows the lesson changes on a tune step (live preview). `ProfilePages` gains a `pfTab` prop. The CSS is in the "Lesson guide", "Profile section tabs" and "Bottom navigation margins" blocks at the end of `system/uxgate.css`.
- **Desktop lesson layout:** the speaker and the problem move to the right column, above the prompt and the choices, for every step type. The left column keeps only the example or live preview. With the screen, the problem and the answers all in view, there's no scrolling on a 900px-tall laptop. Phones keep their order: speaker, preview, prompt, choices. On a tune step the preview sticks to the top while the choices scroll, so a change is always visible.
- **Choices drive the preview** (tune steps): every choice shows an eye icon on hover or focus. The picked choice shows an "In preview" / «في المعاينة» chip. The preview header has a "Showing B" / «يعرض ب» chip that matches the picked key. On each change, the preview frame glows once (600 ms), the part that changed gets a dashed highlight outline and a "Changed" / «تغيّر» tag for about 1.5 s, and a polite live region says "Preview changed to C: Start my free week". There's no glow under reduced motion, but the tag and the chip still show.
- **First-lesson tour:** it runs at the start of the sample lesson (guests, `who=guest`) and the first lesson after sign-in (`who=first`), once per account (once per browser for guests). First comes a welcome card ("Show me" / "Skip tour"), then 4 spotlights, each with "n of 4", Back, Next and Skip: (1) the speaker and the problem, (2) the example or preview, (3) the choices and Check, (4) the progress bar ("8 to 12 steps… each unit ends with a skill check"). The last button is "Start the lesson". The spotlight is a 4px `--hl` ring with the rest dimmed at 62%. Each tip is a modal dialog: focus moves into it, Esc skips, and focus returns to the step heading at the end. On phones the tip docks to the bottom, or to the top when the target is low on the screen. Add "Show the lesson tour again" in Settings > Help.
- **Profile section tabs:** a tab row under the "Profile" title, outside the scrolling body so it stays in place: Overview, Paths, Certificates, Badges, Leaderboard (each with an icon). On phones the row scrolls sideways with a fade at the end edge and snap. Tapping a tab scrolls to its section. The active tab (brand fill) follows the scroll, and the row scrolls the active tab into view. Use links with `aria-current`, not ARIA tabs, because it's in-page navigation.
- **Phone bottom bar:** the bar floats 16px from both sides and 16px above the bottom plus `env(safe-area-inset-bottom)`. In the app, `screens.css` `.app-bnav .bnav { margin-inline: auto }` cancels the side margins, which is why the bar touches the screen edges. Keep the 420px max width centred, but put the 16px on `.app-bnav` as padding. Page content needs bottom padding equal to the bar height plus that gap.

## Arabic Shown label and lesson tour reset (canvas v78, matches PR #191)

- The Arabic skill label for Shown is now «أثبتت» everywhere it is used as a label (skill chips, legends, path and profile rows, emails). Sentences that use the verb (for example «أثبتّ مهارة») keep «أثبتّ».
- The lesson tour is remembered per browser. Settings > Help gets a new row: "Show the lesson tour again" / «اعرض جولة الدرس مرة أخرى», with the note "On this browser, at the start of your next lesson" / «على هذا المتصفح، في بداية درسك التالي».

## App updates noted on the canvas (v82, 7 Nov 2026)

- **Tap the video to play or pause** (PR #205), on board S2-2: a tap or click on the picture toggles play and pause, and so does the control bar button. Design hint: show the play or pause icon in the centre for 0.6 s (a 64px circle, 50% black, white icon), with no flash under reduced motion. The control bar button keeps its label for screen readers.
- **Onboarding preview card** (PR #204), on board S3-4: it shows only paths that are live and playable.
- **Certificate page and Share on LinkedIn** (PR #203): board S3-16, spec `slice-3/certificate.md`.
