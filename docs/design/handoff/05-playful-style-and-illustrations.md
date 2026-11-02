# Playful style and illustrations

Eyad wants UXGate to feel playful, not corporate. The playful layer below sits on top of the brand colours. It borrows one general idea from game-like learning apps, the raised "pressable" surface, and builds everything else from UXGate's own brand. Do not copy Duolingo's colours, mascot, layouts or illustrations.

Live reference: the illustration gallery, which also shows the playful surface in light and dark (https://claude.ai/artifact/VEQxq7qzAxXtjdiZDuZViR).

## 1. Raised "ledge" surfaces

Every pressable thing (buttons, choices, cards you can tap, chips) has a **2px outline and a solid 4px ledge** under it: `box-shadow: 0 4px 0 <ledge colour>`, no blur. When pressed it **sinks onto its ledge**: `transform: translateY(4px)` and the ledge goes to 0, in 80 ms. Static content (text panels, sheets) keeps a soft shadow or none, so only pressable things look pressable.

| Surface | Fill | Outline | Ledge (light) | Ledge (dark) |
| --- | --- | --- | --- | --- |
| Primary button | UXGate blue #005F99 (dark #4CC3E8) | none | #003F66 | #1E7FA6 |
| Highlight pill (XP, rewards) | Cyan #78E4FC, navy text | none | #2BB5DE | #2BB5DE |
| Secondary button, card, choice | White (dark #032E3B) | #D3E8F0 (dark #0E3A4A) | #C3DDE8 / #D3E8F0 | #021F29 / #0E3A4A |
| Selected choice | #E0F4FD (dark #08384A) | #4CC3E8 | #4CC3E8 | #4CC3E8 |
| Right (after Check) | Mint #DDF5E8 (dark #0D3326) | #3DAA80 | #3DAA80 | #4CD69A |
| Wrong (after Check) | #FDE8EB (dark #3A0F18) | #E8707F | #E8707F | #FF6B7D |

Sizes: buttons 48 to 56 px tall, radius 14 (small CTAs and reward pills fully rounded, like the brand posts); choices radius 16, at least 56 px tall; cards radius 18 to 20. Progress bars are chunky (14 to 16 px) with a cyan fill that has its own inner ledge and a light top highlight.

## 2. Other ways to make it playful

- **Bold, friendly type.** Cairo 700 to 800 and Titillium Web 700 for titles and buttons; generous sizes. Sentence case, no all-caps.
- **Illustrations everywhere a moment matters**: welcome, empty states, success, paywall, path covers, emails. Use the soft 3D set below; never flat stock art.
- **Bouncy, quick motion.** Press = sink; selection = a small 0.97 → 1 "boing"; rewards pop in with a slight overshoot (`cubic-bezier(.2,.8,.3,1.25)`), XP counts up, the progress bar fills with a short bounce and a light streak across it, confetti only at lesson end. Never shake or flash on a wrong answer.
- **The UXGate face.** The logo door has a face. Its existing animations (blink, success, checking) can react in small moments: checking while scoring, success at lesson end, blink in empty states. The logo itself never changes.
- **Reward colours.** Gold for trophies, stars and medals; cyan for XP and highlights; mint for right. Keep coral only for alerts.
- **Playful copy, still calm.** "Nice one!", "Lesson done!", "You're on a 12 day streak". Encouraging, never pushy or guilt-based.
- **Stickers and badges.** The rotated star badge from the brand posts ("جديد", new) for new paths and features.
- **Optional sound and haptics** on Check, right and lesson end, off by default.

## 3. Illustration set

Folder `illustrations/` in this pack (also in the repo at `docs/design/system/illustrations/`).

- **Style:** soft 3D, like the trophy, bell and gift in the brand posts. One light source at the top left, glossy highlight on the left edge, soft floor shadow, no outlines. Materials: white and ice, UXGate blue, cyan, navy, mint, gold (rewards only), coral (alerts only).
- **Files:** 33 stills as `static/uxgate-ill-<name>.svg` (240 × 240) and `png/` at 480 × 480; 9 animations as `animated/uxgate-anim-<name>.svg` with CSS inside, plus a still `png-poster/`.
- **Sizes:** 240 px for full-screen moments, 160 px in sheets and cards, 96 px beside text.
- **Motion rules:** one animated illustration per screen. One-time moments (lesson done, welcome) play once; status loops (saving, searching) run only while the status lasts. Under reduced motion each shows its still frame.

| Group | Illustrations |
| --- | --- |
| Rewards and progress | trophy, xp-star, medal, flame (streak), streak-freeze, target (daily goal), calendar, certificate, gift |
| Learning | gate (welcome), rocket (start), lesson-card, skill-check, review, feedback, bulb (hint), video, path-map |
| Paths and content | path-forms (P01), path-hierarchy (P10), path-usability (P02), article |
| System states | empty-box, search, offline, error, lock, key (unlock, paywall), shield (saved), payment, mail, bell (reminders), support |
| Animated | lesson-done, welcome, xp, streak, reminder, hint, saving, searching, offline |

New illustrations must match: same light direction, same materials, same floor shadow. The generator in the repo (`docs/design/system/illustrations/source/`) can draw new ones in the same style.
