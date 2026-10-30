# Design brief: UXGate relaunch

Updated 30 October 2026.

Sprint 1 design (design system and core learner screens) is done by the admins in Claude Design, starting from the handoff pack in [`handoff/`](handoff/):

| File | What it holds |
| --- | --- |
| [`00-start-prompt.md`](handoff/00-start-prompt.md) | The first message for the Claude Design project |
| [`01-product-brief.md`](handoff/01-product-brief.md) | Product, users, learning model and design rules |
| [`02-brand.md`](handoff/02-brand.md) | Logo, colours, type, icons and the brand look |
| [`03-sprint-1-stories.md`](handoff/03-sprint-1-stories.md) | Sprint 1 design stories with acceptance checks |
| [`04-screens-and-copy.md`](handoff/04-screens-and-copy.md) | Every Sprint 1 screen with English and Arabic copy |

The brand images, logo files and a zip of everything are in the project files under `design-handoff/`.

## Fixed inputs

- **Logo:** the original UXGate logo, unchanged. Files in [`system/logos/`](system/logos/).
- **Colours:** taken from the UXGate Brand Resources: navy #012E4B, UXGate blue #005F99, cyan #78E4FC, ice #F2FAFD, mint #DDF5E8, night #00121B, logo teal #60BEBB.
- **Type:** Cairo for Arabic, Titillium Web for English (Cairo's Latin letters are based on it).
- **Icons:** Phosphor Icons; Tabler Icons outline at 1.5 stroke only for gaps.
- **Logo motion:** six animations for review in [`system/logo-motion/`](system/logo-motion/), described in [`system/motion-and-video.md`](system/motion-and-video.md).
- **Video:** the design system also drives the Remotion lesson videos; [`system/video/`](system/video/) holds the video theme and the frame-driven logo.

## Rules the design must meet

- Mobile first at 360 px; desktop layouts recompose, not stretch (U47).
- LTR and RTL designed side by side; icons with direction flip, media controls, numbers and the logo do not (U49).
- Light and dark from the same semantic tokens (U57).
- WCAG 2.2 AA contrast measured on real colours (U14), meaning never by colour alone (U16), 44 px minimum targets (U27), visible focus (U28).
- Selection is separate from evaluation (U25): only Check shows right or wrong.
- Every component has its full state set (U24).
- Motion explains change and respects reduced motion (U53).
- No hearts, energy, timers on thinking steps, or loss-framed warnings. Never copy Duolingo or Brilliant.

When Sprint 1 design is approved, its tokens JSON goes into [`system/`](system/) and EN-01 turns it into `packages/tokens`.
