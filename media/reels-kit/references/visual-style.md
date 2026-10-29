# Visual style: UX Debugger

Tokens: `config/theme.tokens.json` (copied to `src/brand/theme.tokens.json` in the project).
Components: `src/debugger/*` (shell, pointers, selection, dim, note, inspector, change tag, camera) and `src/demo/*`
(illustrative product screens). Reference: `templates/debugger-preview` storyboard + `src/episodes/debugger-preview/Scene.tsx`.

## Frame (1080×1920, composed natively for vertical)

| Region | Geometry | Contents |
|---|---|---|
| Workspace | full canvas | neutral `#F2F3F6` with a faint dot grid |
| Viewport | x 60, y 168, 960×1078, radius 36 | the product: browser page or prototype screen at full width (no device bezel) |
| Toolbar | top 72 px of the viewport | right: inspect glyph + «هتحلها ازاي؟» · middle: address/prototype label · left: «مثال توضيحي» (if illustrative) + mode chip (متوقف / فحص / إعادة التجربة) |
| Caption band | y 1262–1454 | two-line captions; never over UI or annotations |
| Reserved | top 150 px, bottom 465 px | platform overlays: nothing critical |

The product is the main visual. Chrome stays minimal: one viewport, one toolbar, no side panels.
Product UI is designed at viewport width (960 px). Row text ≥ 40 px, secondary text ≥ 28 px; anything smaller must be enlarged by the camera before it's discussed.

## Colour
- Workspace `#F2F3F6`, surfaces white, text `#171A21` (muted `#5B6170`), borders `#DDE1E8`.
- **Indigo `#4F46E5` belongs to the debugger only**: selection outlines, handles, name tags, inspect cursor badge,
  change tags, inspector title. Products never use it. The illustrative demo product uses teal (`demo.*` tokens) so
  selection can't be mistaken for product UI. Real screenshots keep their own colours.
- Notes: dark `#171A21` bubble, white text. Warnings/illustrative chip: `#C2410C` on `#FFF1E8`.

## Typography
IBM Plex Sans Arabic (Arabic + Latin, OFL), weights 400–700, loaded locally. RTL containers use `dir="rtl"`;
pure-English labels (addresses, terms) use `dir="ltr"`. Whole words are styled; never colour part of an Arabic word.

## Pointers
- **Inspect cursor** (the debugger): black arrow, white edge, indigo badge, indigo click pulse. It selects, never "uses" the product.
- **User touch** (the person using the product): soft grey circle with press + ripple. It performs interactions.
- Targets come from exported component geometry (`rowRect`, `subRect`, …), never eyeballed coordinates.

## Signature sequence (adapt to the script; not every step every time)
1. **Interaction**: user touch performs the relevant action or shows the UI state.
2. **Pause**: frame holds under a light veil; mode chip «متوقف».
3. **Select**: inspect cursor hovers (dashed outline), clicks (solid indigo outline + handles + short name tag).
4. **Dim + enlarge**: everything else dims (`FocusDim`); the camera enlarges the detail toward its reading side (right for Arabic).
5. **One observation**: a single short `Note` (≤ 1 line, ~8 words), optionally a `source` line for a supporting
   reference. Open the `Inspector` only when it adds facts (2–3 rows), then collapse it.
6. **Change**: apply the design change visibly in the product, with a `ChangeTag`. Show its trade-off as a separate short note.
7. **Replay**: mode chip «إعادة التجربة», state resets, the interaction repeats with the change.
If the recording contains «طيب هتحلها ازاي؟», step 6 starts on it.

## Debugger kit additions (from the Trust Calibration episode)
- Modes on the toolbar chip: متوقف (paused), فحص (inspect), تعديل (change, after the «طيب هتحلها ازاي؟» turn),
  إعادة التجربة (replay), مقارنة (closing A/B comparison).
- `Tag`: a small chip inside a row's free (left) side. Indigo = fact taken from the source; orange dashed = inference or
  risk. Use it to classify fields without covering their values.
- `Checklist`: bottom panel for a 2–3 part design decision; each item lights the element it refers to.
- `Selection labelSide="left"` when the name tag would cover the label of the row above (RTL rows keep text on the right).
- Park the inspect cursor just under the element it points at, never on its text.
- `OptionsCompare` (closing question): two versions of the same element, labelled أ / ب, plus the comment prompt.
- `ScanPath`: a dotted line joining a dot under each emphasised word — shows what the eye lands on, line by line,
  without covering the text.
- `SearchScreen` (search field + suggestions + Arabic keyboard) measures each text segment, so `segRect`/`partRects`
  can outline exactly the matched or added part of a suggestion. Emphasis modes: `match`, `rest`, `color`, `none`.
- **Emphasis inside one Arabic word** (e.g. «شيرت» in «سويتشيرت»): split the word into two spans with a zero-width
  joiner (U+200D) on both sides of the split, so the letters stay joined across the weight change.
- **Number ranges in Arabic labels**: write them in words («السطور من 3 لـ 5»); «3–5» flips to «5–3» in RTL.
- `RefineScreens` (chat, document with comment sheet + version history, tool-scope examples, confirmation comparison)
  is the example kit for AI-editing episodes: a generic assistant, never a copy of a real product's screens.
- Change notes go inside a row's free left side (`Tag` with "+ …") when a ChangeTag above the element would cover the
  row above it.

## Section themes (problem → solution)
- Colours are CSS variables (`theme.ts`): every component is light by default; `themeVars(t)` on a scene's root blends
  the whole frame to `colorDark`/`demoDark` (t 0 → 1). Use it when Eyad wants a clear switch, e.g. on the turn line:
  light = the problem, dark = the solution, with a short «المشكلة ← الحل» divider (bulb icon). Keep a screen that belongs
  to the problem light (`themeVars(0)` on its wrapper) while it fades out.
- In dark: indigo selection becomes #8C84FF, notes turn light (dark text), product brand teal #2BB59C.

## Icons
- `Tag`, `Note` and `Inspector` take an optional `icon` (line icons in `components/Icons.tsx`: check, alert, eye, hash,
  target, lock, pen, loop, bulb, chat, clock, comment …). One icon per annotation, meaning-first (✓ fact, ⚠ risk,
  eye = review, lock = unchanged, pen = manual edit). Don't decorate captions.

## Sound effects (only on request)
- `episodes/<id>/sfx.json` events use the same cue + frame offsets as the scene; typing events take the exact typed text
  so each key lands on a letter. Kinds: typing, click, tick, pop, send, whoosh, chime. All synthesised (no samples).
- Keep effects well under the voice (keys ≈ −25 dBFS peaks); the final loudness should not move.

## Text density rules
- One focal point per shot. One note at a time. Name tags ≤ 2 words. Notes ≤ 1 line where possible.
- Never keep the inspector, a side panel or a full phone mockup on screen through the episode.
- Contextual examples and trade-offs over universal right/wrong verdicts.
- No fake scores, metrics, console logs, code walls or decorative dashboards.

## Motion
- Frame-driven only (`useCurrentFrame` + `interpolate`), no CSS transitions.
- Enter 12 frames ease-out; select 10; dim 12; camera 20 ease-in-out; cursor travel ~18 frames.
- Every beat is a storyboard cue anchored to spoken words (`storyboard.json` → `timeline.json`).
- A visible change roughly every 2–4 s; hold still while a sentence explains.

## Honesty labels
- «مثال توضيحي» chip in the toolbar whenever UI is invented or recreated.
- Real screenshots/videos: keep meaningful details; credit on screen (small) and in `sources.md`; reference audio muted.
