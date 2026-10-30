import React from "react";
import { C, D } from "../brand/theme";
import { IconCheck } from "../components/Icons";

/* Form controls drawn for the P14 Unit 4 clips (checkbox, radio, toggle) in the example product's own palette. */

export type MarkerKind = "radio" | "check" | "roundcheck";

/** Standard radio (circle with a dot), standard checkbox (rounded square with a tick), or the non-standard round tick. */
export const Marker: React.FC<{ kind: MarkerKind; on?: number; size?: number; warn?: boolean }> = ({ kind, on = 0, size = 24, warn }) => {
  const col = warn ? C.warning : D.brand;
  const round = kind !== "check";
  const filled = kind === "check" || kind === "roundcheck";
  return (
    <span style={{ width: size, height: size, flexShrink: 0, borderRadius: round ? size / 2 : 6, border: `2px solid ${on > 0.5 ? col : C.textMuted}`, background: filled && on > 0.5 ? col : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
      {kind === "radio" && on > 0.5 ? <span style={{ width: size * 0.5, height: size * 0.5, borderRadius: size / 2, background: col }} /> : null}
      {filled && on > 0.5 ? <IconCheck color="#FFFFFF" size={size * 0.7} stroke={3} /> : null}
    </span>
  );
};

/** One option row: marker then label. */
export const Opt: React.FC<{ label: string; kind: MarkerKind; on?: number; o?: number; hint?: string; bold?: boolean; warn?: boolean }> = ({ label, kind, on = 0, o = 1, hint, bold, warn }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, height: 44, fontSize: 17, fontWeight: bold ? 700 : 500, color: C.text, opacity: o }}>
    <Marker kind={kind} on={on} warn={warn} />
    <span>{label}</span>
    {hint ? <span style={{ fontSize: 13, color: C.textMuted }}>{hint}</span> : null}
  </div>
);

/** Digital on/off switch; `on` runs 0 to 1 for the slide. */
export const Toggle: React.FC<{ on: number; w?: number; warn?: boolean }> = ({ on, w = 54 }) => {
  const h = Math.round(w * 0.56);
  const pad = 3;
  return (
    <span style={{ position: "relative", width: w, height: h, borderRadius: h / 2, background: on > 0.5 ? D.brand : C.border, flexShrink: 0, display: "inline-block" }}>
      <span style={{ position: "absolute", top: pad, left: pad + (w - h) * on, width: h - pad * 2, height: h - pad * 2, borderRadius: h, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </span>
  );
};

export const Group: React.FC<{ title: string; top: number; o?: number; children: React.ReactNode }> = ({ title, top, o = 1, children }) => (
  <div style={{ position: "absolute", left: 18, right: 18, top, opacity: o }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: C.textMuted, marginBottom: 4 }}>{title}</div>
    {children}
  </div>
);
