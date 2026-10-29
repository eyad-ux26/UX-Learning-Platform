# Script, recording, transcription, alignment and captions

**The approved script defines the intended content. The recording defines what was actually said, the timing and the
duration.** Neither is silently rewritten.

## Files per episode
| File | Owner | Meaning |
|---|---|---|
| `script.approved.txt` | Eyad (latest approved version) | Intended content. Never edited. |
| `audio/compare.report.md` | generated | Where the recording seems to differ from the script; flags, not proof |
| `audio/spoken.draft.txt` | generated | Copy of the script, the starting point for spoken.txt |
| `spoken.txt` | Claude, confirmed by Eyad | **What is actually said.** Captions and SRT show exactly this. |
| `ISSUES.md` | Claude | Every difference between script and recording, and every change made to spoken.txt |
| `audio/align.txt`, `tokens.json` | generated | Alignment text (English terms respelled) and its map to caption words |
| `audio/words.ctc.json` | generated | Real word timings from forced alignment |

## Steps
1. `episode.sh compare <id>`: forced-aligns the script to the recording (runs of ≥ 2 very-low-confidence words mean
   possibly not said) and transcribes it freely (speech outside the script's coverage means possibly added). Also looks for
   «طيب هتحلها ازاي؟» and reports its time, or that it isn't there.
2. Create `spoken.txt` from `spoken.draft.txt`. Change only the flagged spots, to match the recording, and log each in
   `ISSUES.md`. ASR on Egyptian Arabic is imperfect, so a flag means listen there; if unsure, ask Eyad rather than guess.
   Meaningful differences (skipped or added sentences, changed meaning) are reported to Eyad even after spoken.txt is fixed.
3. `episode.sh align <id>`: CTC forced alignment of spoken.txt to the recording (28 s windows with 2 s overlap, so
   long recordings are fine). Low-confidence words are listed; check sync there.
4. `episode.sh timeline <id>`: captions + SRT + storyboard beats from those timings. A beat anchor that isn't in
   spoken.txt stops the build. Absolute beat times are refused for narration episodes.

Never guess timestamps and never spread captions evenly over the duration.

## Captions
- Text = spoken.txt word for word (QC enforces). English terms are shown as written there (e.g. «الـ findability»).
- At most 2 lines and 30 characters per line. A line that would overflow is scaled down, never wrapped to a third line.
- Pages break at sentence ends and pauses (≥ 280 ms), never inside a two-word term from the lexicon, and never leaving
  a connector (في، على، من، مع، عشان…) at the end of a line or page.
- They sit in the caption band under the viewport, clear of UI and annotations, and highlight the active word.

## Alignment lexicon: `config/alignment.lexicon.json`
Maps the written form of English terms to an Arabic-letter spelling of how Eyad says them (e.g. `categories` → `كاتيجوريز`),
so the CTC aligner times them well. Used for alignment only; captions keep the written form. Entries carry
`evidence` (where he was heard saying it); `proposal` entries are unconfirmed. Add terms as new episodes need them.
