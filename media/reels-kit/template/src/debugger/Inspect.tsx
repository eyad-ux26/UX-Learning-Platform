import React from "react";
import { C, CONTENT, FONT, T } from "../brand/theme";
import { Rect } from "./camera";

/**
 * Selection outline in content-area screen space (pass camRect(...) output).
 * hover: 0..1 dashed hover outline. selected: 0..1 solid outline with handles and a name tag.
 */
export const Selection: React.FC<{ r: Rect; hover: number; selected: number; label?: string; pad?: number; labelSide?: "right" | "left" }> = ({ r, hover, selected, label, pad = 6, labelSide = "right" }) => {
  if (hover <= 0 && selected <= 0) return null;
  const x = r.x - pad, y = r.y - pad, w = r.w + pad * 2, h = r.h + pad * 2;
  const hs = T.stroke.handle;
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 14, border: `${T.stroke.hover}px dashed ${C.select}`, opacity: hover * (1 - selected), boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 14, border: `${T.stroke.select}px solid ${C.select}`, opacity: selected, boxSizing: "border-box", background: `rgba(79,70,229,${0.05 * selected})` }} />
      {selected > 0
        ? [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([hx, hy], i) => (
            <div key={i} style={{ position: "absolute", left: hx - hs / 2, top: hy - hs / 2, width: hs, height: hs, borderRadius: 4, background: "#FFFFFF", border: `3px solid ${C.select}`, boxSizing: "border-box", opacity: selected, scale: String(0.6 + 0.4 * selected) }} />
          ))
        : null}
      {label && selected > 0 ? (
        <div dir="rtl" style={{ position: "absolute", ...(labelSide === "right" ? { right: CONTENT.w - (x + w) } : { left: Math.max(8, x) }), top: y - 50, height: 42, padding: "0 16px", borderRadius: 10, background: C.select, color: C.selectText, fontFamily: FONT, fontSize: T.type.chip, fontWeight: 600, display: "flex", alignItems: "center", whiteSpace: "nowrap", opacity: selected, translate: `0px ${(1 - selected) * 8}px` }}>
          {label}
        </div>
      ) : null}
    </>
  );
};

/** Dims everything in the content area except a rounded hole around `r` (content-area screen space). */
export const FocusDim: React.FC<{ r: Rect; amount: number; pad?: number }> = ({ r, amount, pad = 10 }) => {
  if (amount <= 0) return null;
  const x = r.x - pad, y = r.y - pad, w = r.w + pad * 2, h = r.h + pad * 2, rr = 16;
  const W = CONTENT.w, H = CONTENT.h;
  const hole = `M${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x + rr} Q${x},${y + h} ${x},${y + h - rr} V${y + rr} Q${x},${y} ${x + rr},${y} Z`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: amount }}>
      <path d={`M0,0 H${W} V${H} H0 Z ${hole}`} fill={C.dim} fillRule="evenodd" />
    </svg>
  );
};

/**
 * One concise observation, anchored under (or over) the focused element.
 * Keep to one short sentence; `source` is an optional short reference line.
 */
export const Note: React.FC<{ anchor: Rect; text: string; source?: string; progress: number; place?: "below" | "above"; icon?: React.FC<{ color: string; size?: number; stroke?: number }> }> = ({ anchor, text, source, progress, place = "below", icon: Icon }) => {
  if (progress <= 0) return null;
  const width = Math.min(820, CONTENT.w - 80);
  const left = Math.max(40, Math.min(CONTENT.w - 40 - width, anchor.x + anchor.w / 2 - width / 2));
  const tipX = Math.max(left + 40, Math.min(left + width - 40, anchor.x + anchor.w / 2));
  const top = place === "below" ? anchor.y + anchor.h + 34 : undefined;
  const bottom = place === "above" ? CONTENT.h - anchor.y + 34 : undefined;
  return (
    <div style={{ position: "absolute", left, width, top, bottom, opacity: progress, translate: `0px ${(1 - progress) * (place === "below" ? 14 : -14)}px` }}>
      <div style={{ position: "absolute", left: tipX - left - 14, [place === "below" ? "top" : "bottom"]: -12, width: 28, height: 28, background: C.note, rotate: "45deg", borderRadius: 4 }} />
      <div dir="rtl" style={{ position: "relative", background: C.note, color: C.noteText, borderRadius: T.radius.md, boxShadow: T.shadow.note, padding: "24px 32px", fontFamily: FONT, textAlign: "right" }}>
        <div style={{ fontSize: T.type.note, fontWeight: 600, lineHeight: 1.35, display: "flex", alignItems: "center", gap: 14 }}>
          {Icon ? <span style={{ width: 52, height: 52, borderRadius: 14, background: C.select, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon color="#FFFFFF" size={32} stroke={2.4} /></span> : null}
          {text}
        </div>
        {source ? <div style={{ marginTop: 10, fontSize: 24, opacity: 0.7 }}>{source}</div> : null}
      </div>
    </div>
  );
};

/** Bottom sheet inside the viewport with 2–3 facts about the selected element. Open only when it adds information. */
export const Inspector: React.FC<{ title: string; rows: [string, string][]; progress: number; icons?: React.FC<{ color: string; size?: number; stroke?: number }>[] }> = ({ title, rows, progress, icons }) => {
  if (progress <= 0) return null;
  const h = 96 + rows.length * 74;
  return (
    <div dir="rtl" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, background: C.surface, borderTop: `2px solid ${C.border}`, borderRadius: `${T.radius.lg}px ${T.radius.lg}px 0 0`, boxShadow: "0 -16px 40px rgba(23,26,33,0.10)", translate: `0px ${(1 - progress) * (h + 20)}px`, fontFamily: FONT, padding: "22px 40px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: T.type.inspector, fontWeight: 700, color: C.select, marginBottom: 12 }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: C.select }} />
        {title}
      </div>
      {rows.map(([k, v], i) => {
        const Icon = icons?.[i];
        return (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 74, borderTop: `1px solid ${C.border}`, fontSize: T.type.inspector }}>
          <span style={{ color: C.textMuted, display: "flex", alignItems: "center", gap: 12 }}>{Icon ? <Icon color={C.select} size={30} /> : null}{k}</span>
          <span style={{ color: C.text, fontWeight: 600 }}>{v}</span>
        </div>
        );
      })}
    </div>
  );
};

/** Marks a visible design change. */
export const ChangeTag: React.FC<{ r: Rect; text: string; progress: number }> = ({ r, text, progress }) => {
  if (progress <= 0) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: Math.max(24, r.x), top: r.y - 56, height: 44, padding: "0 16px", borderRadius: T.radius.pill, background: C.selectSoft, color: C.change, border: `2px solid ${C.select}`, fontFamily: FONT, fontSize: T.type.chip, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", opacity: progress, scale: String(0.85 + 0.15 * progress) }}>
      <span style={{ fontSize: 30, lineHeight: 1 }}>+</span>
      {text}
    </div>
  );
};

/**
 * Small annotation chip placed inside a row's free (left) side, vertically centred on the row.
 * tone "select" = indigo (debugger fact), "warn" = orange (attention / inference).
 */
export const Tag: React.FC<{ r: Rect; text: string; progress: number; tone?: "select" | "warn"; x?: number; icon?: React.FC<{ color: string; size?: number; stroke?: number }> }> = ({ r, text, progress, tone = "select", x, icon: Icon }) => {
  if (progress <= 0) return null;
  const warn = tone === "warn";
  return (
    <div dir="rtl" style={{ position: "absolute", left: x ?? r.x + 18, top: r.y + r.h / 2 - 23, height: 46, padding: "0 16px", borderRadius: T.radius.pill, background: warn ? C.warningSoft : C.selectSoft, color: warn ? C.warning : C.select, border: `2px ${warn ? "dashed" : "solid"} ${warn ? C.warning : C.select}`, fontFamily: FONT, fontSize: T.type.chip, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", boxSizing: "border-box", opacity: progress, scale: String(0.85 + 0.15 * progress) }}>
      {Icon ? <Icon color={warn ? C.warning : C.select} size={26} stroke={2.4} /> : null}
      {text}
    </div>
  );
};

/**
 * Debugger panel docked at the bottom of the viewport with a title and up to 3 numbered items.
 * items[i].p (0..1) reveals each item; `active` highlights the item being discussed.
 */
export const Checklist: React.FC<{ title: string; items: { text: string; p: number }[]; active?: number; progress: number }> = ({ title, items, active = -1, progress }) => {
  if (progress <= 0) return null;
  const h = 100 + items.length * 84;
  return (
    <div dir="rtl" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, background: C.surface, borderTop: `3px solid ${C.select}`, borderRadius: `${T.radius.lg}px ${T.radius.lg}px 0 0`, boxShadow: "0 -16px 40px rgba(23,26,33,0.12)", translate: `0px ${(1 - progress) * (h + 20)}px`, fontFamily: FONT, padding: "24px 40px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: T.type.inspector, fontWeight: 700, color: C.select, marginBottom: 10 }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: C.select }} />
        {title}
      </div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, height: 84, borderTop: `1px solid ${C.border}`, opacity: it.p, translate: `${(1 - it.p) * -24}px 0px` }}>
          <span style={{ width: 52, height: 52, borderRadius: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, background: i === active ? C.select : C.selectSoft, color: i === active ? C.selectText : C.select }}>{i + 1}</span>
          <span style={{ fontSize: 36, fontWeight: i === active ? 700 : 500, color: C.text }}>{it.text}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * The reading path of the eye across the emphasised parts (dotted indigo line joining a dot under each rect, so it never covers the text),
 * drawn on with `progress`. Use to show what a viewer's eye actually lands on, line by line.
 */
export const ScanPath: React.FC<{ rects: Rect[]; progress: number }> = ({ rects, progress }) => {
  if (progress <= 0 || rects.length < 2) return null;
  const pts = rects.map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h + 4 }));
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  return (
    <svg width={CONTENT.w} height={CONTENT.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <mask id="scan">
        <path d={d} fill="none" stroke="#fff" strokeWidth={14} strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - progress)} />
      </mask>
      <path d={d} fill="none" stroke={C.select} strokeWidth={5} strokeDasharray="2 12" strokeLinecap="round" mask="url(#scan)" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={7} fill={C.select} opacity={Math.max(0, Math.min(1, progress * pts.length - i))} />
      ))}
    </svg>
  );
};
