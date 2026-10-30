# UXGate design system (Sprint 1 and slice 2)

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
- **Reduced motion** (`prefers-reduced-motion: reduce`, end of `uxgate.css`): the press still sinks onto the ledge, at once and with no bounce; the selection frame and fill appear at once; rewards, XP, trophies and sheets use a 140 ms fade; confetti and loops (flame, bell, pulse) show one still frame; spinners keep turning, slower. Sound does not change.

## Step types

- **Choose:** pick one of several answers (`ScreenStep`, `DeskStep`).
- **Tune** (`ScreenTune`, `DeskTune`, images in `steps/tune-*.jpg`): the example screen starts as the step's starting version. Picking an option replaces it in place (live preview, with the changed fields pulsing once and an "Updated" tag), so the learner can try every option before Check. Wrong and right use the same feedback sheets as choose; on mobile the preview folds into "Show the preview again" after Check, on desktop it stays on the left.
- **Compare** (`ScreenCompare`, `DeskCompare`, images in `steps/compare-*.jpg`): the two example screens are the picks (A and B), each a selectable card. When the pick is right, the reason question appears under them and Check runs again; only then does the right sheet show. A wrong pick shows the mistake's feedback and a hint. Confidence chips sit next to Check when the step asks for them.
- Example screens inside steps keep the example product's own style (`MockForm`: Hana's Gym in Barlow and lime, Lunch To Go in Rubik and paprika), always inside the grey MOCK frame.

## Screens in Sprint 1

Mobile (390 wide) and desktop (1440 wide), each in English light and Arabic night: landing, sign up, onboarding, home, path map, lesson step (selected, wrong with hint, right), tune step and compare step (selected, wrong with hint, right; compare also shows the reason question) and lesson end. The clickable flow switches device, language, theme and sound.

Placeholders still open: `[PRICE]` on the landing. The second hint on Hana's gym step and the five landing FAQs now use the copy from the slice 2 brief. Skill states are Practiced تدرّبت · Shown أثبتّ · Kept أتقنت (approved 30 October).

## Slice 2: the full lesson player

Every state inside a lesson: the eight remaining step types, video, concept card, feedback variants, confidence, skill check, mastery round, exit and resume, saving and offline, the guest sample lesson and asking for a review. See `slice-2/README.md`. On the canvas they are on the page "6 · Slice 2 · Lesson player", and the two editable components are on "Screen parts".
