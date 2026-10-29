# Eyad's narration style (Egyptian Arabic)

> Reference for **visual pacing, storyboard planning and caption expectations**. Episodes use Eyad's own recordings;
> nothing here is used to generate or imitate speech.

Built from audio analysis of two of Eyad's recordings, not from transcripts alone. Originals are preserved unmodified.

| ID | Source | Length | Nature |
|---|---|---|---|
| **EXP** | `explainer` (uploaded clip, 640×360) | 1:58 | Produced on-camera UX explainer on information architecture / tree testing. **Edited with jump cuts.** |
| **PRES** | `MetLife_Task_Presentation` (1920×1080) | 11:21 | Screen-shared case-study presentation, continuous, unedited delivery |

Tools: Silero VAD, an ERes2Net speaker-embedding model, autocorrelation F0 (70–350 Hz), syllable-nucleus counting
(intensity peaks in voiced frames), Omnilingual-ASR CTC and Whisper-small for word timing/labels, and EBU R128 loudness.
Scripts and raw numbers are archived in `legacy/ai-voice-workflow-2026-10/` (scripts/analyze_voice.py, delivery_stats.py; voice/analysis/).

## A. Measured observations

| Feature | EXP (explainer) | PRES (presentation) | Notes |
|---|---|---|---|
| Speech share of file | 95 % | 90 % | VAD |
| Articulation rate (syllable nuclei / s of speech) | **4.27** | **4.22** | Consistent across contexts; transcript-free |
| Words / min of speech (ASR count) | ≈164 | ≈143 | ASR word splitting is approximate |
| Pause between VAD segments: median / p75 | 0.32 s / 0.38 s | **0.42 s / 0.51 s** | EXP pauses are shortened by editing; use PRES for natural pausing |
| Pauses > 1 s | 0 | 2 in 11 min | Long silences are rare |
| Phrase length between ≥150 ms breaks (median) | 1.48 s | 0.62 s | EXP is scripted and fluent; PRES has frequent micro-breaks (thinking aloud) |
| Median F0 | **138 Hz** | **119 Hz** | Higher, more energetic register on camera |
| Typical within-segment F0 spread (IQR) | 43 Hz | 20 Hz | EXP is far more melodic and emphatic |
| Phrase endings (non-question) ending > +1 st above phrase median | 50 % | 42 % | Frequent continuation rises: phrases often end "open", leading into the next |
| Speaker-embedding similarity within file (median) | 0.89 | 0.87 | Consistent single speaker |
| Cross-file similarity of centroids | 0.71 | | Same person, different mic/room/processing |
| Level / noise | −18.7 LUFS; room tone −40…−48 dB in pauses; 51 isolated full-scale samples (limited, not sustained clipping) | Digitally silent floor (−50 dB), consistent with conferencing noise suppression | |

**Question intonation (limited evidence).** The one clearly identifiable direct question in EXP, the opening
"…تفتكر هتروح على أنهي اختيار؟" (0:03–0:05), **falls** at the end (≈ −2 st vs phrase median, slope ≈ −40 st/s). That is
typical of Arabic wh-questions. An automatic search for more questions in PRES was too noisy to trust (keyword
matching on ASR text), so **no general rule is claimed**. Yes/no-question behaviour is unmeasured.

**Terminology pattern (heard, with timestamps; ASR spelling).** English UX terms are said in English inside Arabic
sentences, usually with the Arabic article and Arabic-style plurals:
اليوزرز (0:36, 0:52), الكاتيجوريز (1:14, 1:28), الفايندابيليتي (1:06, 1:11), الإنفورميشن آركيتكتشر (0:32, 1:49),
المنتال موديل (0:27–0:34), الديزاين (0:59), plus in PRES: البروتوتايب، التاسك، الهوم، الكليمز، الأبليكيشن.
He often **pairs the English term with an Arabic gloss** right after it:
"المنتال موديل… أو النموذج الذهني" (0:27), "التري تيستنج أو الاختبار الشجري" (0:45–0:47),
"الفايندابيليتي أو سهولة إيجاد المعلومات" (1:06–1:09).

**Structure of the explainer (EXP, from its transcript and timing).** Opens with a concrete everyday scenario as a question
(menu, t-shirt, gym), then names the concept, then gives the method (tree testing), two practical variants, then a
call to action (course / subscribe / follow).

## B. Assumptions and judgements (not measured, to be confirmed by Eyad)

- The explainer register (EXP) is the target for reels; the presentation register is the fallback for long-form.
- Emphasis seems to come from pitch excursions on key nouns more than from loudness. The wide F0 spread in EXP
  supports this, but per-word emphasis was not annotated.
- The light editing in EXP (tight pauses) is part of the "reel feel". New recordings are used as delivered; nothing is trimmed.
- ASR spellings of his English terms only approximate his pronunciation; the lexicon entries need his confirmation.

## C. How this is used now
1. **Storyboard pacing.** He speaks about 4.2 syllables/s with short pauses (median ≈0.4 s, rarely > 1 s), so plan
   one visual beat per short phrase group (≈2–4 s). Use his real pauses as the moments for selection and change.
2. **Terminology on screen.** He says English terms with the Arabic article and often adds an Arabic gloss.
   Captions show the term as written in the approved script; a `Note` or name tag may show the English term + gloss.
3. **Alignment.** The way he pronounces English terms is captured in `config/alignment.lexicon.json`, so timing is
   accurate on those words.
4. **Phrase endings.** Phrase-final rises are common, so they are not cues for the end of a thought. Break caption pages
   on punctuation and real pauses, not on pitch.
