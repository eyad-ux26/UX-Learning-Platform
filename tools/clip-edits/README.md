# Clip re-edits

Remotion scenes that replace the slides in an instructor clip with animated UI, keeping the trainer's own voice and camera.
They are built on the reels kit (`media/reels-kit/template` on the `media/uxgate-web` branch).

To rebuild a clip:

1. Copy `media/reels-kit/template` to a scratch folder and run `npm i`.
2. In `src/brand/theme.tokens.json`, set `layout.width` and `layout.height` to 1080, and `layout.viewport` to
   `{ "x": 40, "y": 204, "w": 1000, "h": 690, "toolbarH": 64 }`. In `src/brand/series.json`, set `displayName` to `UXGate`.
3. Copy each `P14-Cxx/Cxx.tsx` to `src/clips/` and `Root.tsx` (it registers every clip) to `src/`.
4. For clip `Cxx`, put its audio at `public/cxx/voice.m4a` (taken from the slide cut in `media/clips/`) and the trainer's
   camera crop at `public/cxx/cam.mp4` (`media/uxgate-web/clips/P14-Cxx.cam.mp4`).
5. `npx remotion render P14-Cxx out/P14-Cxx.mp4 --crf=20`, then copy the result to `media/clips/`.

Done so far: P14-C01, P14-C02, P14-C03.

Beat times in the scene come from the clip's caption timings, so the captions in `content/paths/<path>/captions/`
stay in sync without changes.
