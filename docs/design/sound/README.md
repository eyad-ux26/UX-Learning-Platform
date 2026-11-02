# UXGate sound effects

27 original sound effects for the UXGate learning experience, made for production use.

## Files

- `wav/` 48 kHz, 16-bit mono masters
- `mp3/` 128 kbps, for the web (works in every browser)
- `ogg/` Vorbis, smaller, use as the first source where supported
- `generate_sfx.py` the generator that made every file (needs Python 3 and numpy)
- `LICENSE.txt` CC0 1.0 dedication

## Legal status

Every sound was synthesized from scratch by `generate_sfx.py`, written for UXGate on 30 October 2026. It uses only math: sine, triangle and FM oscillators, filtered noise, envelopes and a small algorithmic reverb. No recordings, samples, loops, presets, sound libraries or AI audio models were used, so no third party holds rights in these sounds. Running the script again rebuilds the same files, which documents where they came from.

The set is dedicated to the public domain under CC0 1.0, so UXGate can use, change and ship it anywhere without attribution or fees. Keep this folder (with the script) in the repository as the record of origin.

## Sound map

| File | When it plays | Length |
|---|---|---|
| `ui-tap` | Any button or card press | 0.06 s |
| `ui-toggle-on` | Switch, checkbox or chip turns on | 0.10 s |
| `ui-toggle-off` | Switch, checkbox or chip turns off | 0.10 s |
| `nav-switch` | Toolbar or tab changes | 0.08 s |
| `select-snap` | An answer is picked: the selection frame snaps on | 0.28 s |
| `check-press` | Check is pressed (plays before the verdict) | 0.16 s |
| `answer-right` | Right answer | 1.39 s |
| `answer-right-streak` | Third right answer in a row | 1.55 s |
| `answer-wrong` | Wrong answer (gentle, never a buzzer) | 0.84 s |
| `answer-also-works` | Accepted alternative answer | 1.14 s |
| `hint-open` | A hint comment pin appears | 0.41 s |
| `reveal-answer` | Show the answer after 3 tries | 1.02 s |
| `sheet-up` | Feedback sheet or dialog opens | 0.28 s |
| `sheet-down` | Feedback sheet or dialog closes | 0.28 s |
| `xp-tick` | Each step of the XP count-up | 0.08 s |
| `xp-gain` | +XP pill appears | 0.95 s |
| `goal-complete` | Daily goal ring closes | 2.21 s |
| `streak-extend` | Streak grows by one day | 1.69 s |
| `streak-freeze` | A streak freeze is used or earned | 1.74 s |
| `lesson-start` | A lesson opens | 0.97 s |
| `lesson-complete` | Lesson end screen | 3.18 s |
| `skill-up` | A skill moves to Practiced, Shown or Kept | 1.53 s |
| `badge-unlock` | Unit badge earned | 2.47 s |
| `gate-open` | A new unit unlocks (pairs with the logo gate animation) | 2.51 s |
| `welcome` | Account created, first time on Home | 2.09 s |
| `notification` | Toast or reminder | 0.93 s |
| `error-soft` | Form or network error | 0.30 s |

## Rules for using them

- Interface sounds stay under 0.3 s. Only celebrations run longer, and none passes 3.2 s.
- Wrong answers use the soft wooden knock, about 6 dB quieter than right. Never a buzzer.
- One sound per moment. When two events coincide (for example right and XP), play the bigger one only, or chain them with a 150 ms gap.
- Every sound pairs with a visual change, so nothing depends on hearing.
- Sound switch in Settings and in the lesson top bar. Start muted when the device is on silent; follow system volume.
- Preload `select-snap`, `check-press`, `answer-right` and `answer-wrong` when a lesson opens, so the first answer has no delay.
- In lesson videos, use the same files at about -18 LUFS under narration.

## Web example

```js
const sfx = (name) => {
  const a = new Audio(`/sfx/${name}.ogg`);
  if (!a.canPlayType('audio/ogg')) a.src = `/sfx/${name}.mp3`;
  a.volume = 0.8;
  return a.play().catch(() => {});
};
```

The key is D major throughout, so sounds that follow each other always sit in tune.
