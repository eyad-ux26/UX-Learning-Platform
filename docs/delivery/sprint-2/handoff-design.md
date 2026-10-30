# Design handoff: Sprint 1 to Sprint 2

30 October 2026, from the "Design Sprint 1 screens" thread. Read this, then `design-brief.md` in this folder. You don't need anything else to start.

## Where things are

- **Canvas** (the design file): https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx, version 23 (Sprint 1 approved by Eyad on 30 October 2026), type Design. Pages: Brand, Tokens, Components, Screens, Clickable flow, Screen parts. Get the source with Artifact `read` and `paths` (for example `project/ScreenStep.dc.html`, `project/uxgate.css`, `project/canvas.json`).
- **PR #34** is a draft on branch `claude/project-thread-oykqp7`, under `docs/design/`. It holds `system/tokens.json`, `tokens.css`, `build_tokens.py`, `uxgate.css`, `logos/`, `sound/` and `steps/`. `docs/design/README.md` has the rules the build needs.
- **Sounds:** 27 CC0 sounds synthesized by us, in `/mnt/project-files/sound/uxgate-sfx/`.

## Canvas mechanics (learned the hard way)

- Every board is a `.dc.html` file using `x-dc`, `helmet`, `{{holes}}`, `sc-for` and `sc-if`, with `dc-import name="Literal"` and `class Component extends DCLogic`. Add `"is_interactive":true` in data-props for boards that must take clicks.
- Publish with `root` = your local canvas folder and `file_path` = `project/canvas.json`, and list only the changed files in `files`. Never publish `support.js` or test boards. Publish at milestones, not after every tweak.
- The page itself saves edits, so a publish can be refused with "changed since you last read". Read those files back, compare, and merge.
- **Assets:** png, jpg, svg, webp, mp4 and woff2 are fine, but **mp3 is refused**. Sounds are audio-only AAC `.mp4` assets played with fetch plus `AudioContext.decodeAudioData`. The `sfxlib` snippet inside `Sound.dc.html` maps sound names to blob ids.
- After a CSS edit, check that the braces balance. One stray `}` hid the selection frame in v21.
- Desktop rows show 1440×900 screens at half size: a 720×450 box with an inner div using `transform: scale(.5)`.

## Design rules (Eyad)

- **Concept: practice on a canvas.** Use design-tool ideas, never Duolingo or Brilliant: a dot-grid ground, a selection frame with white square handles centred on the corners (`.sel-frame`, `.choice.is-selected`), hints as comment pins (`.comment`, `.pin`), people and rewards as cursor tags, frame labels, a floating toolbar on mobile and a layers rail on desktop.
- **Shape:** a playful 4 px ledge. **Every button uses a 14 px radius**; pill shapes are only for pills, chips and tags.
- **Selected state:** `selected-line` is #1677C0 in light and #4CC3E8 at night. All selected states must stay at 3:1 or more.
- **Reduced motion** rules are at the end of `uxgate.css`. New motion must add its reduced version there.
- **Logo:** colour logo on light grounds, white logo or white mark on night and on brand blue. Never redraw it.
- **Fonts:** Cairo for Arabic and Titillium Web for English only. Thmanyah is a trial only: its licence forbids hosting the files, so never upload them (see `brand/fonts/`).
- **Icons:** Phosphor, with Tabler for gaps. Illustrations come from `design-handoff/illustrations/`; many are already uploaded (see `blobmap` ids in boards).
- **Example products** keep their own industry style inside the grey MOCK frame. `MockForm` covers Hana's Gym (Barlow and Almarai, lime) and Lunch To Go (Rubik, paprika). `MockGym` is the older gym mock.
- Every screen comes in mobile 390 and desktop 1440, in EN light and AR night. Arabic is simple MSA, with English UX terms explained.
- No mascots, hearts, energy or lives.
- **Sound** is on by default, with a mute button in the lesson header, nothing plays before the first tap, and the choice is remembered.
- **Skill labels:** Practiced تدرّبت · Shown أثبتّ · Kept أتقنت (approved).

## Reusable parts already built

`ScreenStep` and `DeskStep` (choose), `ScreenTune` and `DeskTune`, `ScreenCompare` and `DeskCompare` (compare, with a reason after a right pick). They share the same feedback sheets: wrong with try count, a kept-first-answer note, hints, Hint, Show the answer and Try again; right with XP, Why? and Continue. Each takes a `state` prop and has `sfx` hooks. The row boards (`Row*`) lay out the states for review.

## Open items

- `[PRICE]` on the landing page.
- The real hints come from the content thread. Until then, keep the sample hints.
