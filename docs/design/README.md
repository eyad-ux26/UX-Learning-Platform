# UXGate design system (Sprint 1, slice 2 and slice 3)

The live design lives in the design canvas: https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx (pages: Brand, Tokens, Components, Screens, Clickable flow, Screen parts). This folder holds the parts engineering and video need as files.

## Concept: practice on a canvas

UXGate borrows ideas from design tools, never their look. Lessons sit on a 16 px dot-grid canvas, a picked answer gets a selection frame with corner handles, hints arrive as comment pins, people and rewards appear as named cursor tags, navigation is a floating toolbar on mobile and a layers rail on desktop, and a path reads like a layers panel. Playful comes from the 4 px ledge, the snap motion and the sound. No mascot, hearts, lives or energy, and no other app's colours or layouts.

## Folders

- `system/tokens.json`, `system/tokens.css`: colour roles (light and night, contrast measured), type scale for both scripts, space, radius, elevation and motion. Same names in both files (`--ug-*`). `system/build_tokens.py` regenerates them.
- `system/uxgate.css`: the reference stylesheet used by every board: components, the design-tool layer (`.sel-frame`, `.comment`, `.pin`, `.cursor-tag`, `.frame-label`), the floating toolbar (`.bnav`) and the desktop shell (`.dk-*`). Icon classes point at canvas uploads; in the app use the `@phosphor-icons` package with the same names.
- `logos/uxgate-icon-mark-white.*`: the mark from the official white logo, cropped, not redrawn. Rule: colour logo on light grounds, white logo or white mark on night and on brand blue. Never the colour logo on night.
- `sound/`: 27 original sound effects (WAV masters, MP3, OGG), the generator, the sound map and a CC0 licence. Every sound was synthesized from code with no samples, so it is safe for production. See `sound/README.md`.

## Accessibility rules the build must keep

- **Selected state:** `selected-line` is #1677C0 in light (4.74:1 on surface, 4.18:1 on selected-bg) and #4CC3E8 in night (7.05:1). The selection frame and its corner handles use it, so the state reads at 3:1 or more (WCAG 1.4.11).
- **Night text:** `text-2` is #BBD9E6 (9.73:1 on surface) and `text-3` is #A3C2D0 (7.67:1), lighter than the AA minimum so long reading stays comfortable. Regular secondary and meta text on night steps up one weight: semi-bold (600) in Titillium Web, medium (500) in Cairo, never bold (rule near the end of `uxgate.css`).
- **Reduced motion** (`prefers-reduced-motion: reduce`, end of `uxgate.css`): the press still sinks onto the ledge, at once and with no bounce; the selection frame and fill appear at once; rewards, XP, trophies and sheets use a 140 ms fade; confetti and loops (flame, bell, pulse) show one still frame; spinners keep turning, slower. Sound does not change.

## Step types

- **Choose:** pick one of several answers (`ScreenStep`, `DeskStep`).
- **Tune** (`ScreenTune`, `DeskTune`, images in `steps/tune-*.jpg`): the example screen starts as the step's starting version. Picking an option replaces it in place (live preview, with the changed fields pulsing once and an "Updated" tag), so the learner can try every option before Check. Wrong and right use the same feedback sheets as choose; on mobile the preview folds into "Show the preview again" after Check, on desktop it stays on the left.
- **Compare** (`ScreenCompare`, `DeskCompare`, images in `steps/compare-*.jpg`): the two example screens are the picks (A and B), each a selectable card. When the pick is right, the reason question appears under them and Check runs again; only then does the right sheet show. A wrong pick shows the mistake's feedback and a hint. Confidence chips sit next to Check when the step asks for them.
- Example screens inside steps keep the example product's own style (`MockForm`: Hana's Gym in Barlow and lime, Lunch To Go in Rubik and paprika), always inside the grey MOCK frame.

## Screens in Sprint 1

Mobile (390 wide) and desktop (1440 wide), each in English light and Arabic night: landing, sign up, onboarding, home, path map, lesson step (selected, wrong with hint, right), tune step and compare step (selected, wrong with hint, right; compare also shows the reason question) and lesson end. The clickable flow switches device, language, theme and sound.

The lesson preview card on the landing works: the visitor picks B or C and taps Check (disabled until a pick), sees the right or wrong feedback in the card, and on a right answer gets +10 XP and "Keep going" into the free sample lesson; a wrong answer offers Try again.

Landing header and hero (approved 1 November): Sign in uses the neutral outline button (`.btn-neutral`), the language switch the quiet neutral button (`.btn-quiet`), and the hero title the neutral ink (`--ink-neutral`), in both themes; a "You" cursor tag sits in the mobile hero. The main call to action stays brand blue.

Language switch before sign-in: the same quiet globe button ("عربي" on English pages, "English" on Arabic pages) is on the landing, sign up and onboarding, mobile and desktop. On sign up and onboarding it sits at the top, next to Skip or opposite the logo.

Onboarding has all three questions on the canvas (prop `q` on `ScreenOnboarding` and `DeskOnboarding`): 1, why you want to learn UX (four goals); 2, what to get better at first, with the suggested path; 3, time each week, a daily goal of 1 to 3 lessons and a daily reminder. Question 1 has no Back; question 3 ends with "Start learning" / «ابدأ التعلّم» (was Finish / إنهاء).

Reminder on question 3 (canvas v39, classes `.rem`, `.time-btn`, `.tp*` in `system/uxgate.css`):

- Label "Daily reminder" / «تذكير يومي». Row: a `.switch` (role switch, on by default) labelled "Remind me at" / «ذكّرني الساعة», then a `.time-btn` pre-filled with **8:00 PM** / «8:00 م» (bell icon, value, caret).
- Help when on: "One reminder a day at this time. Your browser will ask to allow it." / «تذكير واحد في اليوم في هذا الوقت. سيطلب المتصفح إذنك أولًا.» Help when off: "No reminders. You can turn them on in Settings." / «بدون تذكيرات. يمكنك تفعيلها من الإعدادات.» When off, the time button gets `.is-disabled` and `aria-disabled="true"`.
- Phone: the time button opens the native time picker (`input type="time"`), no custom picker.
- Desktop: the time button (`aria-haspopup="dialog"`, `.is-open` while open) opens the `.tp` popover above it (400 wide). Inside: title "Reminder time" / «وقت التذكير» with the current value; four `.tp-preset` quick picks, Morning 8:00 AM, Midday 1:00 PM, Evening 8:00 PM, Night 10:00 PM (صباحًا، ظهرًا، مساءً، ليلًا); three `.tp-col` listboxes, Hour (1 to 12, five visible, outer two `.is-far`), Minute (00, 15, 30, 45), AM/PM (ص / م), selected cell `.tp-cell.is-on`; footer Cancel / «إلغاء» (ghost) and Set time / «حفظ الوقت» (primary). Esc and Cancel close without saving. The open state is on the board `RowDeskOnboarding` (4th column), prop `picker="open"`.

Scenario text (the line above a question, such as "Hana runs a small gym…") uses the `.scn` class: full ink, weight 500, 15 px on mobile and 18 px on desktop (`.scn-lg`), with a taller line height in Arabic. It used to be small, light and grey, which was hard to read in Arabic. The lesson player's `.lp-scn` uses the same style.

On every question screen a scenario character now tells the scenario in first person: an avatar next to a speech bubble with "Name · Role". Their face changes with the answer: talking, then happy after a right answer, thinking after a wrong one. See `system/characters/README.md` for the cast, files and sizes. Hana always owns the gym. The visitor who signs up is Salma, and the clinic patient is Ahmed, so no cast member plays two people.

The desktop home has no search bar: learner search is not planned yet, so it was removed rather than shipped as a box that does nothing.

Prices replaced `[PRICE]` on the landing in slice 5 (249 EGP a month in Egypt, $8 in the Gulf, $5 in other Arab countries, approved 2 November). The second hint on Hana's gym step and the five landing FAQs now use the copy from the slice 2 brief. Skill states are Practiced تدرّبت · Shown أثبتّ · Kept أتقنت (approved 30 October).

## Slice 2: the full lesson player

Every state inside a lesson: the eight remaining step types, video, concept card, feedback variants, confidence, skill check, mastery round, exit and resume, saving and offline, the guest sample lesson and asking for a review. See `slice-2/README.md`. On the canvas they are on the page "6 · Slice 2 · Lesson player", and the two editable components are on "Screen parts".

## Slice 3: progress across several paths

Paths tab, choosing and switching paths, home with several paths, onboarding changes, lesson end variants (next lesson, replay at half XP, skills reaching Shown, badge earned, end of a path), streak and freezes, why each number changed, skill states and badges, review across paths, profile with the reminder time picker, certificate and public achievement page, the opt-in leaderboard, and the illustration and sound map. See `slice-3/README.md`. On the canvas they are on the page "7 · Slice 3 · Progress", and the three editable components are on "Screen parts".

## Slice 4: account, notifications and public pages

Settings with notification choices per kind and channel, download and delete account, our push ask before the browser’s, the notifications inbox, help and review requests, seven email templates, public path pages (interactive, hybrid, coming soon), privacy and terms, 404, error, offline and maintenance pages, sign in with Apple, and the illustration and sound map. See `slice-4/README.md`. On the canvas they are on the page "8 · Slice 4 · Account and public", and the five editable components are on "Screen parts".

## Slice 5: subscriptions

The paywall from a locked unit and from a certificate, the plans page (monthly or annual, Free next to Pro, codes and the student price), the checkout hand-off to Paymob (Egypt) or Paddle (everyone else), the four checkout results, Plan and billing in Settings, change plan, cancel, refund request, payment problems, six billing emails, locked states for a free learner, and the illustration and sound map. See `slice-5/README.md`. On the canvas they are on the page "9 · Slice 5 · Subscriptions", and the two new editable components are on "Screen parts".
