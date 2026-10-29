---
name: egyptian-ux-reels
description: Produce «هتحلها ازاي؟», Eyad's Egyptian Arabic UI/UX reels in the UX Debugger style, from his latest approved script, his own recorded narration and episode references, to a narrated MP4 with captions, a silent MP4, SRT, Remotion project and credits.
---

# egyptian-ux-reels: «هتحلها ازاي؟» (UX Debugger)

Vertical 1080×1920 UI/UX episodes for practitioners. The product interaction sits in a prototype/browser viewport
inside a minimal designer's inspection tool. Narration is **Eyad's own recording**; there is no generated speech.

Each part is independently editable:
| Part | Edit | Read |
|---|---|---|
| Series identity | `config/series.json` | `references/series-identity.md` |
| Visual tokens | `config/theme.tokens.json` | `references/visual-style.md` |
| Debugger shell, cursors, selection, inspection | `template/src/debugger/*` | `references/visual-style.md` |
| Recorded-audio processing | `scripts/ingest_recording.py`, `scripts/clean_narration.py` (opt-in), `scripts/patch_recording.py` (on request), `config/production.config.json` | `references/recorded-audio.md` |
| Transcription, alignment, captions | `scripts/compare_script_recording.py`, `align_ctc.py`, `make_timeline.py`, `config/alignment.lexicon.json` | `references/captions-alignment.md` |
| Episode storyboard and assets | `episodes/<id>/storyboard.json`, `refs/`, `src/episodes/<id>/Scene.tsx` | `references/workflow.md` |
| Rendering and export | `scripts/render_outputs.sh`, `src/episodes/registry.tsx` | `references/workflow.md` |
| Style references | series-level: `references/series/`; episode-level: `episodes/<id>/refs/references.md` | |

## Non-negotiables
1. **Recorded voice only.** Use only the narration file supplied for the current episode. No TTS, no cloning, no reuse
   of earlier or preview audio. Keep the original read-only; by default apply only linear volume normalisation to a
   copy. Never speed up or pitch-shift his delivery. Breath removal + voice enhancement (`episode.sh clean`) runs only
   when he asks for it for that episode. Mute narration inside reference videos unless he explicitly asks.
2. **Script vs recording.** The latest approved script = intended content. The recording = actual wording, timing and
   duration. Run `compare`, write `spoken.txt` only to match what was said, log differences in `ISSUES.md`, and report
   meaningful ones. Never silently rewrite either.
3. **Real timing only.** Captions and beats come from forced alignment of the recording. No guessed or evenly spread
   timestamps. Duration = the full recording + a short tail; never cut to a fixed reel length.
4. **Captions** follow spoken.txt word for word, at most 2 lines, in the band under the viewport (never over UI or
   notes), with correct Arabic and mixed-language rendering.
5. **Identity:** «هتحلها ازاي؟» only as the small toolbar identifier. No spoken intro, no bumper. Start on the hook. If the
   recording contains «طيب هتحلها ازاي؟», use it as the inspect → solve turn; never insert or repeat it. End on the
   script's closing question.
6. **Honesty:** «مثال توضيحي» on invented or recreated UI. Describe references only from what is actually visible; report
   inaccessible references precisely. No fake scores, dashboards, console logs or code walls.
7. **Verification:** run `qc`, look at the contact sheet, and report every check that couldn't be done.

## Signature visual sequence (adapt to the script)
1 interaction (user touch) → 2 pause (veil, «متوقف») → 3 select (inspect cursor, indigo outline + name tag) →
4 dim others + enlarge → 5 one short observation or supporting reference (inspector only if it adds facts, then collapse) →
6 visible design change (+ its trade-off) → 7 replay the interaction. One focal point per shot; contextual trade-offs over
universal right/wrong.

## Commands (from the Remotion project root)
```bash
export SKILL=<this folder> MODELS=<models>    # once: bash $SKILL/scripts/setup_models.sh "$MODELS"; npm i
bash $SKILL/scripts/episode.sh new <id>                    # paste latest script; refs → episodes/<id>/refs/
bash $SKILL/scripts/episode.sh ingest <id> <recording>     # original kept; normalised copy
bash $SKILL/scripts/episode.sh compare <id>                # flags → spoken.txt + ISSUES.md
bash $SKILL/scripts/episode.sh align <id>
bash $SKILL/scripts/episode.sh clean <id>                  # ONLY if Eyad asks: remove breaths + enhance, re-align
bash $SKILL/scripts/episode.sh patch <id> <file> <a> <b> <pa> <pb>   # ONLY with his re-recorded fix for a damaged stretch
bash $SKILL/scripts/episode.sh end <id> "<last text>"     # ONLY if Eyad asks to stop after a sentence (keeps *.full.*)
# sound effects (only on request): episodes/<id>/sfx.json → sfx.wav, made by the timeline step, mixed by render
# storyboard.json (beats anchored to spoken words) + src/episodes/<id>/Scene.tsx; register in src/episodes/index.ts
bash $SKILL/scripts/episode.sh timeline <id>
bash $SKILL/scripts/episode.sh render <id> <CompId>        # one visual render → <id>.mp4 + <id>.silent.mp4
bash $SKILL/scripts/episode.sh qc <id>                     # then LOOK at out/qc/contact_sheet.png
bash $SKILL/scripts/episode.sh package <id>
```
Use the official Remotion plugin skills while building scenes (remotion-best-practices → markup, captions, render).
If Chrome Headless Shell can't be downloaded, set `REMOTION_BROWSER`.

`legacy/` holds the archived AI-voice workflow and earlier outputs. It is reference only; never use it for an episode.
