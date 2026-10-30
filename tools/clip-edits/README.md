# Clip re-edits

Remotion scenes that replace the slides in an instructor clip with animated UI, keeping the trainer's own voice and camera.
They are built on the reels kit (`media/reels-kit/template` on the `media/uxgate-web` branch).

To rebuild a clip:

1. Copy `media/reels-kit/template` to a scratch folder and run `npm i`.
2. In `src/brand/theme.tokens.json`, set `layout.width` and `layout.height` to 1080, and `layout.viewport` to
   `{ "x": 40, "y": 204, "w": 1000, "h": 690, "toolbarH": 64 }`. In `src/brand/series.json`, set `displayName` to `UXGate`.
3. Copy each `P14-Cxx/Cxx.tsx` and the shared `p14.tsx` to `src/clips/`, and `Root.tsx` (it registers every clip) to `src/`.
   Copy `kit/brand/*` over `src/brand/` and `kit/debugger/*` over `src/debugger/`: these carry the UXGate design system
   look (see below).
   Put the fonts in `public/fonts/` (Cairo, Titillium Web, IBM Plex Sans Arabic), the white logo and mark from
   `docs/design/` in `public/brand/`, and these sounds from `docs/design/sound/wav/` in `public/sfx/`:
   `gate-open`, `lesson-complete`, `ui-tap`.
4. For clip `Cxx`, put its audio at `public/cxx/voice.m4a` (taken from the slide cut in `media/clips/`) and the trainer's
   camera crop at `public/cxx/cam.mp4` (`media/uxgate-web/clips/P14-Cxx.cam.mp4`).
5. `npx remotion render P14-Cxx out/P14-Cxx.mp4 --crf=20`, then copy the result to `media/clips/`.
6. For the preview, re-encode at `-crf 24 -preset slow -c:a aac -b:a 96k -ac 1 -movflags +faststart` so each clip
   stays under the 20 MiB asset limit, and upload it to the unit's preview artifact (see `docs/content-format.md`).

Done so far: P14-C01 to P14-C09.

## Look (design system)

- The frame around the product is the UXGate night palette (`colorDark` in `theme.tokens.json`): night #00121B
  ground with a 24 px dot grid, the white UXGate logo in the toolbar, cyan #78E4FC for the active caption.
  Never the colour logo on night.
- The product inside the frame is an example product, not UXGate. It resets to the light palette and the product
  font (IBM Plex Sans Arabic) and carries its own industry brand colour, listed in `EXAMPLES` in `DebuggerShell.tsx`
  (سوق لين, وصلة, درب, نغمة, حكاوي, بريدي, مشوار). The toolbar chip reads «مثال · name».
- UI text uses "UXGate Sans": Cairo for Arabic, Titillium Web for Latin.
- Sounds sit under the narration at about -18 LUFS: `gate-open` on the intro card, `ui-tap` on each tap,
  `lesson-complete` on the recap card.

Each clip cut starts and ends at a topic boundary in the source video. Clips built with `p14.tsx` (all but C03) open
with a 2.5 s title card (`INTRO`) before the voice starts and close with a 6 s recap card (`OUTRO`). Beat times in a
scene are voice times, wrapped in `v()`, so the captions in `content/paths/<path>/captions/` are the voice timings
shifted by +2.5 s.
