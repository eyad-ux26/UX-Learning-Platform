# UXGate design system (Sprint 1)

The live design lives in the design canvas: https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx (pages: Brand, Tokens, Components, Screens, Clickable flow, Screen parts). This folder holds the parts engineering and video need as files.

## Concept: practice on a canvas

UXGate borrows ideas from design tools, never their look. Lessons sit on a 16 px dot-grid canvas, a picked answer gets a selection frame with corner handles, hints arrive as comment pins, people and rewards appear as named cursor tags, navigation is a floating toolbar on mobile and a layers rail on desktop, and a path reads like a layers panel. Playful comes from the 4 px ledge, the snap motion and the sound. No mascot, hearts, lives or energy, and no other app's colours or layouts.

## Folders

- `system/tokens.json`, `system/tokens.css`: colour roles (light and night, contrast measured), type scale for both scripts, space, radius, elevation and motion. Same names in both files (`--ug-*`). `system/build_tokens.py` regenerates them.
- `system/uxgate.css`: the reference stylesheet used by every board: components, the design-tool layer (`.sel-frame`, `.comment`, `.pin`, `.cursor-tag`, `.frame-label`), the floating toolbar (`.bnav`) and the desktop shell (`.dk-*`). Icon classes point at canvas uploads; in the app use the `@phosphor-icons` package with the same names.
- `logos/uxgate-icon-mark-white.*`: the mark from the official white logo, cropped, not redrawn. Rule: colour logo on light grounds, white logo or white mark on night and on brand blue. Never the colour logo on night.
- `sound/`: 27 original sound effects (WAV masters, MP3, OGG), the generator, the sound map and a CC0 licence. Every sound was synthesized from code with no samples, so it is safe for production. See `sound/README.md`.

## Screens in Sprint 1

Mobile (390 wide) and desktop (1440 wide), each in English light and Arabic night: landing, sign up, onboarding, home, path map, lesson step (selected, wrong with hint, right) and lesson end. The clickable flow switches device, language, theme and sound.

Placeholders still open: `[PRICE]` on the landing, the copy for the second hint and the FAQ, and the Arabic labels for the Shown (أثبتّ) and Kept (حافظت) skill states.
