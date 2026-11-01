import React from "react";
import { C, D, PRODUCT_FONT } from "../brand/theme";
import { IconCheck, IconClose } from "../components/Icons";

/* Form controls and example panels for the P14 Unit 4 clips (checkbox, radio, toggle), in the example product's palette. */

export type R = { x: number; y: number; w: number; h: number };
/** Panel slots in content coordinates: one centred example, or a left/right pair as the trainer describes them. */
export const ONE: R = { x: 450, y: 40, w: 520, h: 546 };
export const LEFT: R = { x: 405, y: 76, w: 285, h: 500 };
export const RIGHT: R = { x: 702, y: 76, w: 285, h: 500 };
export const WIDE: R = { x: 405, y: 76, w: 582, h: 360 };

export type MarkerKind = "radio" | "check" | "squaredot";

/** Standard radio (circle with a dot), standard checkbox (square with a tick), or the mixed square-with-a-dot look. */
export const Marker: React.FC<{ kind: MarkerKind; on?: number; size?: number }> = ({ kind, on = 0, size = 28 }) => {
  const lit = on > 0.5;
  const round = kind === "radio";
  return (
    <span style={{ width: size, height: size, flexShrink: 0, borderRadius: round ? size / 2 : Math.max(4, size * 0.18), border: `2px solid ${lit ? D.brand : "#8A929E"}`, background: kind === "check" && lit ? D.brand : "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
      {kind === "radio" && lit ? <span style={{ width: size * 0.5, height: size * 0.5, borderRadius: size / 2, background: D.brand }} /> : null}
      {kind === "squaredot" && lit ? <span style={{ width: size * 0.5, height: size * 0.5, borderRadius: 2, background: D.brand }} /> : null}
      {kind === "check" && lit ? <IconCheck color="#FFFFFF" size={size * 0.72} stroke={3} /> : null}
    </span>
  );
};

/** One option row: marker then label. */
export const Opt: React.FC<{ label: string; kind: MarkerKind; on?: number; o?: number; strike?: boolean; size?: number; fs?: number; h?: number }> = ({ label, kind, on = 0, o = 1, strike, size, fs = 23, h = 54 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, height: h, fontSize: fs, fontWeight: 500, color: strike ? "#8A929E" : "#1F2328", opacity: o, textDecoration: strike ? "line-through" : undefined }}>
    <Marker kind={kind} on={on} size={size} />
    <span>{label}</span>
  </div>
);

/** Digital on/off switch, drawn left-to-right as in the source slides; `on` runs 0 to 1 for the slide. */
export const Toggle: React.FC<{ on: number; w?: number }> = ({ on, w = 50 }) => {
  const h = Math.round(w * 0.58);
  const pad = 3;
  return (
    <span dir="ltr" style={{ position: "relative", width: w, height: h, borderRadius: h / 2, background: on > 0.5 ? D.brand : "#C4CAD3", flexShrink: 0, display: "inline-block" }}>
      <span style={{ position: "absolute", top: pad, left: pad + (w - h) * on, width: h - pad * 2, height: h - pad * 2, borderRadius: h, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </span>
  );
};

/** A product screen card: white (or dark for a design-tool panel), with an optional brand header. */
export const Panel: React.FC<{ r: R; o?: number; head?: string; dark?: boolean; dim?: number; children: React.ReactNode }> = ({ r, o = 1, head, dark, dim = 0, children }) =>
  o <= 0 ? null : (
    <div dir="rtl" style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, opacity: o * (1 - dim * 0.6), borderRadius: 22, overflow: "hidden", background: dark ? "#2C2C2C" : "#FFFFFF", boxShadow: "0 16px 36px rgba(0,0,0,0.35)", fontFamily: PRODUCT_FONT, color: dark ? "#FFFFFF" : "#1F2328", boxSizing: "border-box" }}>
      {head ? <div style={{ height: 56, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", padding: "0 20px", fontSize: 21, fontWeight: 700 }}>{head}</div> : null}
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );

/** Right or wrong badge above a panel, in the night frame's calm status colours. */
export const Verdict: React.FC<{ r: R; good: boolean; p: number }> = ({ r, good, p }) =>
  p <= 0 ? null : (
    <div style={{ position: "absolute", left: r.x + r.w / 2 - 22, top: r.y - 52, width: 44, height: 44, borderRadius: 22, opacity: p, scale: String(0.7 + 0.3 * p), background: good ? "#0D3326" : "#3A2A06", border: `2px solid ${good ? "#4CD69A" : "#E8A93A"}`, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
      {good ? <IconCheck color="#4CD69A" size={26} stroke={3} /> : <IconClose color="#FFC970" size={24} stroke={3} />}
    </div>
  );

export const Q: React.FC<{ text: string; o?: number }> = ({ text, o = 1 }) => (
  <div style={{ fontSize: 24, fontWeight: 700, color: "#B4532A", marginBottom: 12, opacity: o }}>{text}</div>
);

export const Small: React.FC<{ text: string; muted?: boolean }> = ({ text, muted }) => (
  <div style={{ fontSize: 20, fontWeight: 600, color: muted ? "#6B7280" : "#1F2328", margin: "4px 0 8px" }}>{text}</div>
);

export { C };
