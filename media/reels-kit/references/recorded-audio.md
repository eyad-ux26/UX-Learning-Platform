# Recorded narration (Eyad's own voice)

Every episode uses **only** the narration file Eyad supplies for that episode. There is no TTS, no voice cloning and no
reuse of audio from previews or earlier episodes. (The old AI-voice workflow is archived in
`legacy/ai-voice-workflow-2026-10/` and is never called.)

## Intake: `episode.sh ingest <id> <file>` → `scripts/ingest_recording.py`
- Copies the file byte-for-byte to `episodes/<id>/audio/original/` (read-only) and records its SHA-256. A new take
  needs a new file name; originals are never overwritten.
- Accepts audio or video files (uses the first audio track).
- Measures loudness as it will play (dual-mono), true peak, leading/trailing silence.
- Writes `narration.normalized.wav`: **linear gain only** toward −14 LUFS, never past −1 dBTP. If the ceiling limits
  the gain, the result is quieter than −14 and the report says so. No limiter, compression, EQ, trimming, tempo or
  pitch change; pauses, pitch and speed are untouched.
- `audio.report.md` documents all of it. Ingesting a new take deletes stale alignment and timeline for that episode.

## Replacing a damaged stretch (ONLY with a patch Eyad recorded): `episode.sh patch <id> <file> <cut-from> <cut-to> <patch-from> <patch-to>`
- Times: cut-from/cut-to in the ORIGINAL take (not the cleaned timeline; map cleaned → original via
  `words.ctc.uncleaned.json`), patch-from/patch-to in the patch file. Choose points inside pauses around the re-recorded
  words; the script snaps each to the quietest 10 ms frame nearby.
- `scripts/patch_recording.py` matches the patch's tone (1/3-octave long-term spectrum, ±8 dB, linear-phase FIR) and
  level (speech level of the 8 s around the cut, ±6 dB), joins with 12 ms crossfades, keeps the unpatched working copy
  (`narration.source.unpatched.wav`), copies the patch into `audio/original/`, and writes `patch.report.md`.
- If the episode was cleaned, the step restores the uncleaned files first. Then: align → clean (if requested) →
  timeline → render → qc. Check level/tone of the patch against its neighbours after enhancement and log it in ISSUES.md.
- Verify the replacement's wording with the aligner and the transcription; captions follow what was said.

## Optional cleanup (ONLY when Eyad asks for it for this episode): `episode.sh clean <id>`
Runs after `align` (breath detection needs word timings) → `scripts/clean_narration.py`, then re-aligns.
- **Breath removal:** a breath must sit inside a pause between aligned words (or before the first word), ≥ 80 ms away
  from both words, unvoiced, ≥ 18 dB below the median speech level (so soft onsets such as «هـ» are never taken), above
  the noise floor, 60–1000 ms long. The guarded pause is replaced by silence, kept at 0.28–0.6 s (leading breath → 0.25 s).
  Pauses with only mouth clicks/room noise are silenced without changing their length.
- **Protections:** inside a sentence (no punctuation before the pause) only pauses ≥ 0.4 s can hold a breath (a short
  mid-phrase "breath" is usually a consonant such as «ش»); frames at the edges of a pause within 20 dB of speech level
  (word onsets/tails) are never silenced. The script refuses to write unless every aligned word survives
  sample-for-sample, and reports `words intact N/N`.
- **Enhancement:** high-pass 70 Hz, light FFT denoise, EQ (−2 dB @ 250 Hz, +2 dB @ 3.5 kHz, +1.5 dB air), de-esser,
  2.5:1 compression, inaudible phase rotation, then linear gain to −14 LUFS with a 4×-oversampled, delay-compensated
  peak limiter (true peak ≤ −1 dBTP). Length is checked to be unchanged by the enhancement.
- Files: `narration.cleaned.wav`, `narration.enhanced.wav`, `cleanup.report.md` (every cut with its original time),
  `cleanup.log.json`. The uncleaned files are kept as `*.uncleaned.*`; the original stays in `audio/original/`.
  `public/episodes/<id>/narration.normalized.wav` becomes the cleaned, enhanced, dual-mono narration.
- Log it in `ISSUES.md`, re-run `timeline`, and say in the delivery that the voice was processed on request.
  Tune with `--keep-gap`, `--max-gap`, `--below-speech`, `--above-floor` (pass as `episode.sh clean <id> "<args>"`).

## Ending early (ONLY when Eyad asks): `episode.sh end <id> "<last text>"`
- `scripts/trim_narration.py` trims spoken.txt to the sentence ending with <last text>, finds that sentence's last
  aligned word, and cuts the processed narration 0.35 s after it with a 60 ms fade. Full-length copies are kept
  (`spoken.full.txt`, `*.full.*`). Then re-run align, cut the storyboard after the last kept beat (keep
  `storyboard.full.json`), timeline, render, qc. This is the only case where the video doesn't run the whole recording.

## Duration
The episode is the whole recording (or the whole cleaned recording, when cleanup was requested), plus a short visual tail (600 ms). Never shorten
content or speed up the recording to hit a reel length.

## Reference media
Reference videos placed in the viewport (`RefMedia`) are muted by default. Unmute only if Eyad explicitly asks, and set
`allowAudio: true` on that reference in the storyboard.

## Final audio checks (qc.py)
- The final MP4's audio covers the full recording, with zero offset (≤ 2 ms) and matching first/last 3 s.
- The silent MP4 has no audio stream.
- Listening is still required for the first and last words and for clicks at the edges. Report it if it couldn't be done.
