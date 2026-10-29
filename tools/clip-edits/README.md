# Clip re-edits

Remotion scenes that replace the slides in an instructor clip with animated UI, keeping the trainer's own voice and camera.
They are built on the reels kit (`media/reels-kit/template` on the `media/uxgate-web` branch).

To rebuild a clip:

1. Copy `media/reels-kit/template` to a scratch folder and run `npm i`.
2. In `src/brand/theme.tokens.json`, set `layout.width` and `layout.height` to 1080, and `layout.viewport` to
   `{ "x": 40, "y": 204, "w": 1000, "h": 690, "toolbarH": 64 }`. In `src/brand/series.json`, set `displayName` to `UXGate`.
3. Copy `<clip>/C03.tsx` to `src/clips/` and `<clip>/Root.tsx` to `src/`.
4. Put the clip's audio at `public/c03/voice.m4a` (taken from the cut clip) and the trainer's camera crop at
   `public/c03/cam.mp4` (`media/uxgate-web/clips/P14-C03.cam.mp4`).
5. `npx remotion render P14-C03 out/P14-C03.mp4 --crf=20`, then copy the result to `media/clips/`.

Beat times in the scene come from the clip's caption timings, so the captions in `content/paths/<path>/captions/`
stay in sync without changes.
