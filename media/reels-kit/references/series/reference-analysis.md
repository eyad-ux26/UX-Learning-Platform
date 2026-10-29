# Visual reference analysis (persistent series-style references)

> These two reels are **series-level** style references. Episode-specific references go in `episodes/<id>/refs/references.md`.
> The "Takeaways" table below was written for the first visual direction. The current direction is the **UX Debugger**
> (`../visual-style.md`). Still valid: platform-safe zones, pacing (a change every 2–4 s), −14 LUFS, two-line captions,
> English term + Arabic gloss. Superseded: the phone mockup, TermCard headline zone and "product-UI only" chrome.

Analysed 2026-10-11 from full downloads of both reels, made through Eyad's signed-in Chrome.
Method: contact sheets (1 frame / 20 s and 1 frame / 6 s), full-resolution stills, ffmpeg scene-cut detection
(threshold 0.25), a frame-difference motion profile at 10 fps, EBU R128 loudness, and CTC transcription of the first 30 s.
Everything below was observed or measured. Interpretation is marked **→ takeaway**.

## Reel A — facebook.com/reel/1331075329083095

*"إزاي تبني Video Upload Feature صح في منصة كبيرة؟"*, by Abdelrahman Mohamed

| Measured | Value |
|---|---|
| Format | 1280×720 delivered (1920×1080 rendition exists), 16:9 landscape, 30 fps |
| Length | 9 min 36 s |
| Hard cuts (scene > 0.25) | 21 in 576 s |
| Visual change events | 8.2 / min; median gap 4.9 s (IQR 2.2–11.4 s); 79 % of frame pairs nearly static |
| Loudness | −14.2 LUFS integrated, LRA 3.0 LU |
| Narration | Egyptian Arabic, conversational. It opens with a scenario ("المطلوب تعمل فيتشر لرفع الفيديوهات في منصة تعليمية…"), then names the common mistake |

**Observed visual language**
- Dark navy background, perspective grid "floor", soft out-of-focus colour glows (teal, violet).
- Neon single-colour accents per topic (orange "UPLOAD" pill, cyan "Object Storage", pink "Processing Pipeline", green "Webhooks").
- Line icons (file, server, bucket, laptop), small uppercase letter-spaced mono labels above scenes (e.g. "SHOULD THE VIDEO PASS THROUGH THE BACKEND?").
- Systems shown as diagrams that build progressively: dashed animated arcs for data paths, sequence diagrams (CLIENT/SERVER with HTTP lines), progress bars, a globe for CDN, bar meters, cost counters ("$40,884").
- On-screen text is English; narration is Arabic. No burned-in captions in any sampled frame.
- Ending: a recap grid of numbered questions with one highlighted, then "File Upload Feature vs Video Platform".

## Reel B — facebook.com/reel/2010876252789319

*"يعني إيه webhooks وإزاي two systems بيكلموا بعض؟"*, by Eslam Mohsen

| Measured | Value |
|---|---|
| Format | 1080×1920 vertical, 30 fps |
| Length | 3 min 12 s |
| Hard cuts | 0, so every change is an in-place animation |
| Visual change events | 22.8 / min; median gap 2.3 s (IQR 1.2–3.4 s); 63 % nearly static |
| Loudness | −14.1 LUFS, LRA 5.4 LU |
| Narration | Egyptian Arabic. ASR of the opening is heavily degraded, which suggests a music bed under the voice (not confirmed by listening) |

**Observed visual language**
- Light lavender-white background, faint dot grid, large blurred pastel blobs (blue, pink, green, yellow).
- Thin blue progress bar along the very top edge, growing through the video.
- Persistent outlined pill "BACKEND · WEBHOOKS" (uppercase, letter-spaced) near the top.
- Heavy geometric display sans for headlines. The keyword sits in a solid blue rectangle with white text; section labels sit in black, red or yellow boxes ("THE COST", "SECURITY", "TL;DR").
- Flat illustrations with dark outlines and offset shadows (servers, a Stripe-like card, envelopes, a shield), small mono captions under objects, dark code blocks with green mono text.
- **All content stays in roughly the top 60–65 % of the frame; the bottom third is empty in every sampled frame.**
- Structure: question hook → problem → old way (polling) → cost (counter "8,640 requests/day") → definition → why standard (toggle list) → pitfalls (#1 idempotency, security) → TL;DR → comment prompt + "See you in the NEXT TOPIC →".
- No burned-in captions in sampled frames.

## Takeaways adopted (original, not copied)

| Seen | Takeaway for egyptian-ux-reels |
|---|---|
| B keeps the bottom third clear | Captions sit above the bottom 24 %. The stage ends at y = 1250 and the caption box keeps away from the right-edge reaction icons. Third-party guidance (billo.app, 2026) says to avoid the top 14 % and bottom 20–35 % for 9:16 Reels. |
| Both: English term on screen, Arabic narration | Same pattern Eyad already uses: an English term card plus an Arabic gloss pill (`TermCard`). |
| Both: one idea per screen, progressive build | One beat per cue. Each beat is anchored to a word of the approved script. |
| A slow (≈5 s), B fast (≈2.3 s) | Target a change roughly every 2–4 s for reels; never cut faster than the narration. |
| Both: topic chip at top | Topic chip, plus a separate **مثال توضيحي** badge whenever UI is invented. |
| Both ≈ −14 LUFS | Master narration to −14 LUFS integrated. |
| Neither has captions | Ours do (accessibility, sound-off viewing). Two lines, highlighted active word. |

## Deliberately different

- **Light, product-UI look instead of illustration.** Demos are realistic mobile and web UI (cards, lists, drawers, forms) in a plain light theme (#F7F8FA / #171A21 / #4263EB). There are no outlined cartoon objects, neon glows or perspective grid.
- **Arabic-first RTL typography** (IBM Plex Sans Arabic), not English display headlines.
- Highlights are UI-native: selection tint, dashed warning outline, touch ripple, gentle camera push-ins. There are no keyword boxes on headlines.
- No music bed by default (narration clarity first); optional, and if added kept ≥ 18 dB under voice.
