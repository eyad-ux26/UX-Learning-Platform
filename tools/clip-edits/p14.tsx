import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C, D, FONT, T } from "../brand/theme";
import { Rect } from "../debugger/camera";
import { IconCheck, IconClose } from "../components/Icons";
import { enter, exit } from "../lib/timeline";

/*
 * Shared parts of the P14 clip re-edits. Every clip opens with a short title card before the trainer speaks and ends
 * with a recap card after he stops, so it never starts or ends mid-thought. Captions are shifted by INTRO to match.
 */
export const FPS = 30;
export const INTRO = 2.5; // seconds of title card before the voice
export const OUTRO = 6; // seconds of recap card after the voice
export const s = (sec: number) => Math.round(sec * FPS);
/** Frame for a time in the trainer's voice track (seconds from the start of the cut clip). */
export const v = (sec: number) => s(INTRO + sec);
export const clipFrames = (voiceSec: number) => s(INTRO + voiceSec + OUTRO);

export type IconC = React.FC<{ color: string; size?: number; stroke?: number }>;
export const wi = (I: IconC) => <I color="#FFFFFF" size={30} stroke={2.4} />;
export const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// ---- one phone, right of the content area (content coordinates; its own layout is in local pixels) ----
export const PH = { x: 640, y: 22, w: 300, h: 582 };
export const L = (x: number, y: number, w: number, h: number): Rect => ({ x: PH.x + x, y: PH.y + y, w, h });
export const loc = (r: Rect): React.CSSProperties => ({ position: "absolute", left: r.x - PH.x, top: r.y - PH.y, width: r.w, height: r.h, boxSizing: "border-box" });
export const phoneRect: Rect = L(0, 0, PH.w, PH.h);

export const PhoneFrame: React.FC<{ children: React.ReactNode; fade?: number }> = ({ children, fade = 1 }) => (
  <div dir="rtl" style={{ position: "absolute", left: PH.x, top: PH.y, width: PH.w, height: PH.h, borderRadius: 30, background: "#FFFFFF", border: `2px solid ${C.border}`, boxShadow: T.shadow.viewport, overflow: "hidden", fontFamily: FONT, boxSizing: "border-box" }}>
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>{children}</div>
  </div>
);

export const Header: React.FC<{ title: string; back?: boolean }> = ({ title, back }) => (
  <div style={{ height: 60, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", fontSize: 22, fontWeight: 700 }}>
    {back ? <span style={{ fontSize: 22 }}>→</span> : null}
    {title}
  </div>
);

export const Btn: React.FC<{ r: Rect; text: string; filled?: boolean; o?: number; color?: string }> = ({ r, text, filled, o = 1, color }) => (
  <div style={{ ...loc(r), borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, background: filled ? color ?? D.brand : "transparent", color: filled ? D.onBrand : color ?? D.brand, border: filled ? undefined : `2px solid ${C.border}`, opacity: o }}>{text}</div>
);

export const Scrim: React.FC<{ p: number }> = ({ p }) => (p > 0 ? <div style={{ position: "absolute", inset: 0, background: "rgba(16,18,24,0.5)", opacity: p }} /> : null);

export const Card: React.FC<{ r: Rect; p: number; children: React.ReactNode }> = ({ r, p, children }) =>
  p > 0 ? <div style={{ ...loc(r), borderRadius: 18, background: "#FFFFFF", padding: 18, opacity: p, scale: String(0.92 + 0.08 * p), boxShadow: "0 16px 36px rgba(0,0,0,0.25)" }}>{children}</div> : null;

export const Field: React.FC<{ r: Rect; label?: string; value: string; caret?: boolean; ltr?: boolean }> = ({ r, label, value, caret, ltr }) => (
  <>
    {label ? <div style={{ ...loc({ ...r, y: r.y - 26, h: 22 }), fontSize: 14, fontWeight: 600, color: C.textMuted }}>{label}</div> : null}
    <div dir={ltr ? "ltr" : "rtl"} style={{ ...loc(r), borderRadius: 10, border: `2px solid ${caret ? D.brand : C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 17, fontWeight: 600, color: value ? C.text : C.textMuted, letterSpacing: ltr ? 1 : 0, background: "#FFFFFF" }}>
      {value}
      {caret ? <span style={{ width: 2, height: 22, background: D.brand, marginInlineStart: 2 }} /> : null}
    </div>
  </>
);

/** A strike-through cross over a rect, drawn with progress p. */
export const Strike: React.FC<{ r: Rect; p: number }> = ({ r, p }) =>
  p > 0 ? (
    <svg style={{ ...loc(r), overflow: "visible", pointerEvents: "none" }} viewBox={`0 0 ${r.w} ${r.h}`}>
      <path d={`M16 16 L${r.w - 16} ${r.h - 16} M${r.w - 16} 16 L16 ${r.h - 16}`} stroke={C.warning} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, p)} fill="none" />
    </svg>
  ) : null;

// ---- notes on the free (left) side of the content area ------------------------------------------------
export const SideNote: React.FC<{ y: number; text: string; p: number; icon?: React.ReactNode; big?: boolean; warn?: boolean; w?: number }> = ({ y, text, p, icon, big, warn, w = 420 }) => {
  if (p <= 0) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: 34, width: w, top: y, opacity: p, translate: `${(1 - p) * -16}px 0px`, background: warn ? C.warning : C.note, color: C.noteText, borderRadius: T.radius.md, boxShadow: T.shadow.note, padding: big ? "22px 26px" : "18px 24px", fontFamily: FONT, display: "flex", alignItems: "center", gap: 14, boxSizing: "border-box" }}>
      {icon ? <span style={{ width: 48, height: 48, borderRadius: 14, background: warn ? "rgba(255,255,255,0.22)" : C.select, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span> : null}
      <span style={{ fontSize: big ? 34 : 29, fontWeight: 600, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
};

/** Small numbered chip, e.g. "الحالة 2", above a note. */
export const CaseChip: React.FC<{ y: number; text: string; p: number; warn?: boolean }> = ({ y, text, p, warn }) =>
  p > 0 ? (
    <div dir="rtl" style={{ position: "absolute", left: 34, top: y, opacity: p, height: 44, padding: "0 18px", borderRadius: 999, display: "flex", alignItems: "center", fontFamily: FONT, fontSize: 24, fontWeight: 700, background: warn ? C.warningSoft : C.selectSoft, color: warn ? C.warning : C.select, border: `2px solid ${warn ? C.warning : C.select}` }}>{text}</div>
  ) : null;

/** Left-side list card: a title and items revealed one by one, each marked do (✓) or don't (✕). */
export const ListCard: React.FC<{ y?: number; title?: string; p: number; items: { text: string; p: number; no?: boolean }[]; w?: number }> = ({ y = 120, title, p, items, w = 440 }) => {
  if (p <= 0) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: 34, width: w, top: y, opacity: p, translate: `${(1 - p) * -16}px 0px`, fontFamily: FONT, background: "#FFFFFF", border: `2px solid ${C.border}`, borderRadius: 22, boxShadow: T.shadow.viewport, padding: "18px 24px", boxSizing: "border-box" }}>
      {title ? <div style={{ fontSize: 26, fontWeight: 700, color: C.select, lineHeight: 1.4, marginBottom: 6 }}>{title}</div> : null}
      {items.map((it, i) => (
        <div key={it.text} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 62, borderTop: i || title ? `1px solid ${C.border}` : undefined, opacity: it.p, translate: `${(1 - it.p) * -20}px 0px` }}>
          <span style={{ width: 38, height: 38, borderRadius: 19, background: it.no ? C.warningSoft : C.selectSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {it.no ? <IconClose color={C.warning} size={22} stroke={2.8} /> : <IconCheck color={C.select} size={22} stroke={2.8} />}
          </span>
          <span style={{ fontSize: 26, fontWeight: 600, color: C.text, lineHeight: 1.35 }}>{it.text}</span>
        </div>
      ))}
    </div>
  );
};

// ---- clip frame: title band, presenter, voice, intro and recap cards -------------------------------
export const Presenter: React.FC<{ cam: string; hide?: number }> = ({ cam, hide = 0 }) => (
  <div style={{ position: "absolute", left: 40, top: 24, width: 236, height: 160, borderRadius: 20, overflow: "hidden", boxShadow: T.shadow.viewport, border: `2px solid ${C.border}`, background: "#1E2129", opacity: 1 - hide }}>
    <Sequence from={s(INTRO)} layout="none">
      <OffthreadVideo src={staticFile(cam)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </Sequence>
    <div dir="rtl" style={{ position: "absolute", right: 8, bottom: 8, height: 30, padding: "0 12px", borderRadius: 999, background: "rgba(23,26,33,0.78)", color: "#FFFFFF", fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", fontFamily: FONT }}>إياد محمود</div>
  </div>
);

export const TitleBand: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div dir="rtl" style={{ position: "absolute", left: 300, right: 40, top: 40, textAlign: "right", fontFamily: FONT }}>
    <div style={{ fontSize: 40, fontWeight: 700, color: C.text }}>{title}</div>
    <div dir="ltr" style={{ fontSize: 26, fontWeight: 600, color: C.textMuted, marginTop: 10, textAlign: "right" }}>{sub}</div>
  </div>
);

export const Voice: React.FC<{ src: string }> = ({ src }) => (
  <Sequence from={s(INTRO)} layout="none">
    <Audio src={staticFile(src)} />
  </Sequence>
);

/** Full-frame title card for the first INTRO seconds. */
export const IntroCard: React.FC<{ title: string; sub: string; points: string[] }> = ({ title, sub, points }) => {
  const f = useCurrentFrame();
  const o = exit(f, s(INTRO) - 10, 10);
  if (o <= 0) return null;
  return (
    <AbsoluteFill dir="rtl" style={{ zIndex: 50, background: C.workspace, opacity: o, fontFamily: FONT, alignItems: "center", justifyContent: "center", padding: 80, boxSizing: "border-box" }}>
      <div dir="ltr" style={{ fontSize: 30, fontWeight: 700, color: C.select, opacity: enter(f, 2, 12) }}>{sub}</div>
      <div style={{ fontSize: 66, fontWeight: 800, color: C.text, marginTop: 18, textAlign: "center", lineHeight: 1.3, opacity: enter(f, 6, 14), translate: `0px ${(1 - enter(f, 6, 14)) * 20}px` }}>{title}</div>
      <div style={{ display: "flex", gap: 14, marginTop: 40, flexWrap: "wrap", justifyContent: "center" }}>
        {points.map((t, i) => (
          <span key={t} style={{ fontSize: 28, fontWeight: 600, color: C.text, background: "#FFFFFF", border: `2px solid ${C.border}`, borderRadius: 999, padding: "12px 24px", opacity: enter(f, 16 + i * 6, 12) }}>{t}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Full-frame recap card after the voice ends. */
export const RecapCard: React.FC<{ voiceSec: number; title: string; items: { text: string; no?: boolean }[] }> = ({ voiceSec, title, items }) => {
  const f = useCurrentFrame();
  const a = v(voiceSec) + 6;
  const p = enter(f, a, 14);
  if (p <= 0) return null;
  return (
    <AbsoluteFill dir="rtl" style={{ zIndex: 50, background: C.workspace, opacity: p, fontFamily: FONT, alignItems: "center", justifyContent: "center", padding: "60px 90px", boxSizing: "border-box" }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: C.select }}>الخلاصة</div>
      <div style={{ fontSize: 52, fontWeight: 800, color: C.text, marginTop: 10, marginBottom: 30, textAlign: "center", lineHeight: 1.3 }}>{title}</div>
      <div style={{ width: "100%", background: "#FFFFFF", border: `2px solid ${C.border}`, borderRadius: 26, padding: "10px 34px", boxSizing: "border-box", boxShadow: T.shadow.viewport }}>
        {items.map((it, i) => {
          const q = enter(f, a + 10 + i * 8, 12);
          return (
            <div key={it.text} style={{ display: "flex", alignItems: "center", gap: 18, minHeight: 78, borderTop: i ? `1px solid ${C.border}` : undefined, opacity: q, translate: `${(1 - q) * -24}px 0px` }}>
              <span style={{ width: 46, height: 46, borderRadius: 23, background: it.no ? C.warningSoft : C.selectSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {it.no ? <IconClose color={C.warning} size={26} stroke={2.8} /> : <IconCheck color={C.select} size={26} stroke={2.8} />}
              </span>
              <span style={{ fontSize: 32, fontWeight: 600, color: C.text, lineHeight: 1.35 }}>{it.text}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
