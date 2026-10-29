# Production and QC workflow: «هتحلها ازاي؟»

## Roles and inputs
- **Eyad** supplies, per episode: the **latest approved script**, **his recorded narration**, and the **episode references**
  (screenshots, images, videos, links, source credits). He approves `spoken.txt` changes and the final cut, and listens.
- **ChatGPT** may draft scripts (`templates/chatgpt-brief.template.md`), but only Eyad's latest approved version is used.
- **Claude** handles storyboard, UI demonstrations, animation, captions, rendering and QC. Claude never rewrites the
  script, never generates or alters speech, and reports anything it couldn't check.

Always use the latest supplied script and recording. If a newer version arrives mid-production, re-run from `ingest`/`compare`.

## Project layout
```
<remotion project>/                    (copied from template/, npm i once)
  src/brand/        theme.tokens.json, series.json (copies of config/), fonts
  src/debugger/     DebuggerShell, Pointers, Inspect (Selection, FocusDim, Note, Inspector, ChangeTag), camera
  src/demo/         illustrative product screens (CategoryScreen …)
  src/components/   Captions, RefMedia (muted refs), Icons
  src/episodes/     registry.tsx, index.ts (register episodes), <id>/Scene.tsx
  episodes/<id>/    script.approved.txt, spoken.txt, storyboard.json, sources.md, ISSUES.md, refs/, audio/, out/
  public/episodes/<id>/  timeline.json, narration.normalized.wav, ref assets used on screen
```

## Steps (`SKILL=… MODELS=… bash $SKILL/scripts/episode.sh <step> <id> [arg]`)
| # | Step | Produces | Gate |
|---|---|---|---|
| 1 | `new` | episode folder from templates | paste the latest approved script; add references to `refs/` + fill `refs/references.md` |
| 2 | look at every reference | `refs/references.md` filled | describe only what is visible or audible; report inaccessible links precisely |
| 3 | `ingest <file>` | original (read-only), normalised copy, `audio.report.md` | linear gain only; nothing trimmed |
| 4 | `compare` | `compare.report.md`, `spoken.draft.txt` | read every flag |
| 5 | write `spoken.txt` + `ISSUES.md` | caption source | change only flagged spots; report meaningful differences to Eyad |
| 6 | `align` | `words.ctc.json` | check the listed low-confidence words |
| 6a | `patch <file> …` (only with Eyad's re-recorded fix) | patched source, `patch.report.md` | joins in silence; level/tone match; then align again |
| 6b | `clean` (only on request) | `narration.enhanced.wav`, `cleanup.report.md`, re-aligned `words.ctc.json` | every word sample-identical; log in ISSUES.md |
| 6c | `end "<last text>"` (only on request) | trimmed spoken.txt + narration, `*.full.*` kept | ends on the requested sentence; re-run align |
| 7 | storyboard + scene | `storyboard.json` (beats anchored to spoken words), `src/episodes/<id>/Scene.tsx`, register in `index.ts` | signature sequence, one focal point per shot |
| 7b | `sfx.json` (only on request) | `public/<id>/sfx.wav` via make_sfx.py in the timeline step | events on the same cue+frame as the visuals; effects ≥ 20 dB under the voice |
| 8 | `timeline` | `timeline.json`, `<id>.srt` | every anchor resolves |
| 9 | Studio check | `<Id>-Full` composition | |
| 10 | `render <Id>` | `visual.mov` (once) → `<id>.mp4` + `<id>.silent.mp4` | |
| 11 | `qc` | `out/qc/report.md`, `contact_sheet.png` | all automated checks pass **and** the sheet has been looked at |
| 12 | `package` | credits + issues next to the MP4s | |

## Storyboard rules
- Narration episodes: every beat is `{ id, anchor: "<spoken words>", occurrence?, offsetMs? }`. Absolute times are refused.
- Start on the spoken hook with the visual example; no intro.
- If the compare step found «طيب هتحلها ازاي؟», anchor the solve turn (step 6) on it. Otherwise there is no such beat.
- End on the closing question as recorded; hold the last visual through the tail.
- Silent visual previews only: `"mode": "silent"`, beats use `atMs`, and there are no captions.

## Final deliverables (`episodes/<id>/out/`)
1. `<id>.mp4`: Eyad's narration + burned-in captions.
2. `<id>.silent.mp4`: identical visuals and timing, no audio, no captions.
3. `<id>.srt`
4. The editable Remotion project (the project folder + `public/episodes/<id>/` assets).
5. `<id>.credits.md` (from `sources.md`), plus `<id>.issues.md` if there were script/recording differences.
Both MP4s come from the same `visual.mov`; QC verifies they are identical above the caption band.

## Verification (report what couldn't be done; never claim it passed)
Automated by `qc.py`: streams, frame counts, recording completeness and offset, silent/narrated identity, caption limits,
caption text == spoken.txt, SRT, sync (re-aligned final audio), layout zones.
By eye and ear: Arabic shaping and mixed-direction order, clipping, mobile readability of each focal detail,
caption/annotation collisions, cursor targets and demonstrated interactions, reference accuracy, the honesty chip,
and the complete first and last words of the recording.
