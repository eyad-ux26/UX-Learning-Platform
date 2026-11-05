# UXGate logo motion and video kit

## Logo animations

| File | Length | Use |
| --- | --- | --- |
| `uxgate-motion-splash.svg` | 1.5 s, once | App start, first second of a video (full logo with wordmark) |
| `uxgate-motion-intro.svg` | 1.2 s, once | Sign-in success, path unlocked, video end card |
| `uxgate-motion-loading.svg` | 1.6 s loop | Waits over 400 ms on full screens |
| `uxgate-motion-thinking.svg` | 1.4 s loop | While an answer is scored or a payment confirms |
| `uxgate-motion-success.svg` | 0.9 s, once | Lesson shipped, skill Shown or Kept, certificate |
| `uxgate-motion-blink.svg` | 4.2 s loop | Empty states, 404, offline |

Each has a `-white` twin for dark grounds and videos. They are self-contained animated SVGs: use them in an `<img>` or inline. Under reduced motion they show the still logo.

- Web app: `UXGateLogoMotion.tsx` + `uxgate-logo-motion.css` (same animations as a React component, with `tone="color" | "white"`).
- Videos: `video/UXGateLogoRemotion.tsx` (frame-driven, for Remotion) and `video/uxgate-video-theme.ts` (colours, fonts, sizes on the 1080 canvas, safe areas, timings in frames).

All animations use the original logo paths unchanged.

## Example products in videos

Videos have two layers. The UXGate layer (title card, captions, recap, logo, pointers, selection frames, highlights) is always UXGate style. The example product being discussed always has its own industry identity (fictional brand, its own colours and fonts), sits inside a device or browser frame, and is labelled "Example" on first appearance, so it is never mistaken for UXGate itself. Full rules and starter styles: [`../handoff/06-videos-and-example-products.md`](../handoff/06-videos-and-example-products.md).
