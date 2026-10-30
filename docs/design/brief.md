# Design brief: UXGate relaunch

Sprint 1, 29 October 2026. Designs live in Claude Design; links are at the end of this file.

## The direction: "Practice on the canvas"

UXGate is where designers walk through the gate into real work. The identity keeps the existing UXGate brand (the open-door logo and its blue, cyan, ice and mint palette) and adds one product idea on top. It borrows the language every designer already uses all day, a design tool's canvas, and turns it into a calm, gamified practice space. It is not a copy of any learning app: no mascots, no cartoon world, no hearts.

| Motif | Where it shows |
| --- | --- |
| **Selection frame with handles** | The selected state of every choice: a selected option gets a frame with corner handles, exactly like selecting a layer |
| **Dot-grid canvas** | Backgrounds of the path map, lesson end and empty states |
| **Connectors** | The path map links lessons with prototype-style connector lines |
| **Redlines and measurements** | Concept cards annotate spacing and sizes in a monospace "measurement" style |
| **Layers and properties** | The feedback sheet reads like an inspector panel: what you chose, why it works or fails, what to change |
| **Ship it** | Finishing a lesson is "shipping" a frame; XP and the streak count shipped work |

## Brand

- **Name and domain:** UXGate, uxgate.org.
- **Personality:** calm, smart, encouraging, precise. Talks like a good senior designer in a review.
- **Colour (updated 30 Oct 2026, from the UXGate Brand Resources):** navy text #012E4B, UXGate blue #005F99 for intent (primary action, selection, links), cyan #78E4FC for reward and highlights (XP, streak, key words in videos), ice #F2FAFD and mint #DDF5E8 grounds, deep night #00121B for dark mode and videos. Status colours (right, wrong, warning) stay separate from brand and path colours (U17).
- **Type:** Space Grotesk for display, IBM Plex Sans for Latin text, IBM Plex Sans Arabic for Arabic, JetBrains Mono for numbers and measurements. All free (Google Fonts) and with matching metrics across scripts.
- **Logo:** the original UXGate logo stays exactly as it is (open door with a face, #60BEBB to #005F99 gradient). Files: [`system/logos/`](system/logos/).
- **Logo motion:** six animations built from the original paths (splash, gate opens, loading, checking, success, idle blink), each with a white twin, plus a React component and a Remotion version. See [`system/motion-and-video.md`](system/motion-and-video.md).
- **Icons:** Phosphor Icons (MIT, 1,500+; regular, fill and duotone). Tabler Icons outline at 1.5 stroke only for gaps.
- **Video:** the same system drives the lesson videos (Remotion, 1080 × 1080 at 30 fps, night look, title card, captions, recap card). Values in [`system/video/uxgate-video-theme.ts`](system/video/uxgate-video-theme.ts).

## Rules the design must meet

- Mobile first at 360 px; desktop layouts recompose, not stretch (U47).
- LTR and RTL designed side by side; icons with direction (arrows, progress) flip, media controls and numbers do not (U49).
- Light and dark from the same semantic tokens (U57).
- WCAG 2.2 AA contrast measured on real colours (U14), meaning never by colour alone (U16), 44 px minimum targets (U27), visible focus (U28).
- Selection is separate from evaluation (U25): the handles frame means "selected", only Check shows right or wrong.
- Every component has its full state set: default, hover, focus, pressed, selected, disabled, loading, error (U24).
- Motion explains change and respects reduced motion (U53).
- No hearts, energy, timers on thinking steps, or loss-framed warnings.

## Sprint 1 screens

Mobile, English and Arabic, light and dark:

1. Landing (hero, how it works, paths, price, sign-up)
2. Sign up
3. Onboarding (goal question, path recommendation)
4. Home (next lesson, daily goal, streak, review)
5. Path map
6. Lesson step: selecting, checked right, checked wrong with feedback and hint
7. Lesson end (recap, XP, skills)

Sprint 2 adds every step type, skill check, mastery round, review, paywall, profile, settings, certificate, achievement page, system states, desktop layouts and the admin panel.

## Links

- Design system (Claude Design): https://claude.ai/artifact/2LESW4z1FamcmcUAUJ8Vxs
- Sprint 1 screens (Claude Design canvas, clickable): https://claude.ai/artifact/G4i3nsXhBcx39HLv4ARGAS
- Snapshot in this repo: [`system/`](system/) holds `tokens.json`, the generated `tokens.css`, `components.css`, the original logo files in `logos/`, the logo animations in `logo-motion/` and the video kit in `video/`. Claude Design stays the source; refresh the snapshot when it changes. EN-01 turns these into `packages/tokens`.

The canvas shows every Sprint 1 screen twice: English in the light theme and Arabic (RTL) in the dark theme. Every component in the design system shows its light and dark versions side by side. Each screen also has `lang` and `theme` tweaks, so any combination can be checked. The lesson step is interactive: pick an answer, Check, see the wrong-answer sheet with a hint, Try again, then the right-answer sheet.
