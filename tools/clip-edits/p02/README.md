# P02 clip re-edits (usability heuristics)

The ten P02 clips are short cuts (about 1.5 to 3 minutes, one idea each) from the long "Usability Heuristics" course
videos (`heu 1.mp4` to `heu 10.mp4`, kept outside git). Each clip keeps the trainer's voice and camera and replaces the
slides with an example product drawn in the P14 style, so the look, intro card, recap card, notes and warnings follow
`../README.md`.

| Clip | Lesson | Source | Idea |
| --- | --- | --- | --- |
| P02-C01 | U01-L01 | heu 1, 606.9–698.2 s | A loader that ends in nothing: say what happened |
| P02-C02 | U01-L02 | heu 2, 160.4–276.2 s | Pharmacy app sorted by disease vs the pharmacist's A to Z |
| P02-C03 | U02-L01 | heu 3, 90.0–196.8 s | Back goes back one step, filters kept |
| P02-C04 | U02-L02 | heu 4, 992.3–1105.3 s | Next and Back keep their place on every step |
| P02-C05 | U03-L01 | heu 5, 351.9–471.3 s | Past days disabled in a booking calendar |
| P02-C06 | U03-L02 | heu 6, 224.5–369.5 s | Comparison tables with fixed headers |
| P02-C07 | U04-L01 | heu 7, 56.4–175.6 s | Shortcuts shown next to tools |
| P02-C08 | U04-L02 | heu 8, 194.9–340.3 s | Signal vs noise on a flight booking page |
| P02-C09 | U05-L01 | heu 9 (see cues/P02-C09.json) | Error messages that explain and offer a way out |
| P02-C10 | U05-L02 | heu 10, 919.8–1095.3 s | Help that is easy to scan and search |

## Differences from P14

- The course has several trainers, so the camera tag reads «مدرّب UXGate» (`PRESENTER` in `p14.tsx`), not a name.
- `p02.tsx` adds `Screens` (cross-fading phone screens by voice time), `Tap`, `Row`, `Txt` and `Pic`.
- No silent gaps are cut yet (`cuts.ts` is empty).

## Pipeline (Windows laptop, `C:\Users\eyadm\uxgate-web\heu`)

1. `clipcut.py CLIP "heu N" START END [w:h:x:y]` writes `public/cNN/voice.m4a` and `public/cNN/cam.mp4`. On slides the
   camera is the box at the top right (506×334 at 1414,0); full-frame shots are scaled, or cropped with the optional
   argument (C01 uses `1116:720:700:40`, because heu 1 shows a screen recording beside the trainer).
2. `retx.py "heu N:A:B"` transcribes a window with Whisper medium and word times, for exact cut points and captions.
3. Caption cues are written by hand in `cues/CLIP.json` (Egyptian Arabic as spoken, English translation, source times);
   `mkcaps.py` writes `content/paths/P02/captions/*.vtt` (shifted by the 2.5 s intro) and the transcript fixtures.
4. `renderq.sh C01 C02 …` renders each clip and the preview encode (`-crf 24`, under 20 MiB).
5. `checkquotes.py` checks that every `ref.quote` in P02 is copied exactly from the downloaded NN/g article text.
