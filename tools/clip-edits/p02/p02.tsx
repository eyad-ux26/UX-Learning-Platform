import React from "react";
import { useCurrentFrame } from "remotion";
import { C, D } from "../brand/theme";
import { UserTouch } from "../debugger/Pointers";
import { enter, Key } from "../lib/timeline";
import { PH, v } from "./p14";

/*
 * Helpers for the P02 (usability heuristics) clip re-edits, on top of the shared P14 parts.
 */
export * from "./p14";

/** Shows the screen whose `at` (voice seconds) has passed, cross-fading into each new one. */
export const Screens: React.FC<{ list: { at: number; node: React.ReactNode }[] }> = ({ list }) => {
  const f = useCurrentFrame();
  let cur = 0;
  list.forEach((s, i) => { if (f >= v(s.at)) cur = i; });
  const p = cur > 0 ? enter(f, v(list[cur].at), 10) : 1;
  return (
    <>
      {cur > 0 && p < 1 ? <div style={{ position: "absolute", inset: 0, opacity: 1 - p }}>{list[cur - 1].node}</div> : null}
      <div style={{ position: "absolute", inset: 0, opacity: p }}>{list[cur].node}</div>
    </>
  );
};

/** One tap by the product's user at voice second `at`, on a point in phone pixels. */
export const Tap: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const f = useCurrentFrame();
  const t = v(at);
  const X = PH.x + x, Y = PH.y + y;
  const keys: Key[] = [{ f: t - 16, x: X - 40, y: Y + 120 }, { f: t, x: X, y: Y, click: true }, { f: t + 20, x: X, y: Y }];
  return <UserTouch frame={f} keys={keys} from={t - 18} to={t + 26} />;
};

/** A plain text row in a phone screen. */
export const Row: React.FC<{ y: number; text: string; sub?: string; h?: number; bold?: boolean; tint?: boolean }> = ({ y, text, sub, h = 56, bold, tint }) => (
  <div style={{ position: "absolute", left: 14, right: 14, top: y, height: h, borderRadius: 12, background: tint ? D.brandSoft : "#F4F5F7", padding: "8px 12px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center" }}>
    <div style={{ fontSize: 16, fontWeight: bold ? 700 : 600, color: C.text }}>{text}</div>
    {sub ? <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{sub}</div> : null}
  </div>
);

/** Text at a position inside the phone. */
export const Txt: React.FC<{ y: number; text: string; size?: number; bold?: boolean; muted?: boolean; color?: string; x?: number }> = ({ y, text, size = 16, bold, muted, color, x = 14 }) => (
  <div style={{ position: "absolute", left: x, right: 14, top: y, fontSize: size, fontWeight: bold ? 700 : 500, color: color ?? (muted ? C.textMuted : C.text), lineHeight: 1.4 }}>{text}</div>
);

/** A picture placeholder (photo area) in the product. */
export const Pic: React.FC<{ y: number; h: number; tone?: string; label?: string }> = ({ y, h, tone = "#DCE6EE", label }) => (
  <div style={{ position: "absolute", left: 14, right: 14, top: y, height: h, borderRadius: 16, background: tone, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>{label ?? ""}</div>
);

/**
 * A strike-through cross over a rect in content coordinates, drawn with progress p. Shadows the P14 Strike (which
 * takes phone-local coordinates), because P02 clips draw it in the overlay layer.
 */
export const Strike: React.FC<{ r: { x: number; y: number; w: number; h: number }; p: number }> = ({ r, p }) =>
  p > 0 ? (
    <svg style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, overflow: "visible", pointerEvents: "none" }} viewBox={`0 0 ${r.w} ${r.h}`}>
      <path d={`M16 16 L${r.w - 16} ${r.h - 16} M${r.w - 16} 16 L16 ${r.h - 16}`} stroke={C.warning} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, p)} fill="none" />
    </svg>
  ) : null;
