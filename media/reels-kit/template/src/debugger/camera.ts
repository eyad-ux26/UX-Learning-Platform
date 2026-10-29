import type React from "react";
import { CONTENT, T } from "../brand/theme";
import { tween } from "../lib/timeline";

/** Rect in product-content coordinates (0,0 = top-left of the content area under the toolbar). */
export type Rect = { x: number; y: number; w: number; h: number };

/** A camera stop: from frame `f`, content point (fx, fy) is shown at screen-relative (cx, cy) with scale `s`. */
export type Shot = { f: number; s: number; fx: number; fy: number; cx?: number; cy?: number };

export type Cam = { s: number; tx: number; ty: number };

/** Camera state at a frame. Each shot eases in over motion.zoomFrames from the previous one. */
export const cameraAt = (frame: number, shots: Shot[]): Cam => {
  const val = (k: "s" | "fx" | "fy" | "cx" | "cy", dflt: number) => {
    let v = shots[0][k] ?? dflt;
    for (let i = 1; i < shots.length; i++) {
      v = tween(frame, shots[i].f, shots[i].f + T.motion.zoomFrames, v, shots[i][k] ?? dflt);
    }
    return v;
  };
  const s = val("s", 1);
  const fx = val("fx", CONTENT.w / 2);
  const fy = val("fy", CONTENT.h / 2);
  const cx = val("cx", CONTENT.w / 2);
  const cy = val("cy", CONTENT.h / 2);
  return { s, tx: cx - fx * s, ty: cy - fy * s };
};

/** Map a content-space rect through the camera into content-area screen space (for fixed-width overlays). */
export const camRect = (r: Rect, c: Cam): Rect => ({ x: c.tx + r.x * c.s, y: c.ty + r.y * c.s, w: r.w * c.s, h: r.h * c.s });
export const camPoint = (p: { x: number; y: number }, c: Cam) => ({ x: c.tx + p.x * c.s, y: c.ty + p.y * c.s });

/** Style for the element that holds the product UI under the camera. */
export const camStyle = (c: Cam): React.CSSProperties => ({
  position: "absolute",
  left: 0,
  top: 0,
  width: CONTENT.w,
  height: CONTENT.h,
  transformOrigin: "0 0",
  translate: `${c.tx}px ${c.ty}px`,
  scale: String(c.s),
});
