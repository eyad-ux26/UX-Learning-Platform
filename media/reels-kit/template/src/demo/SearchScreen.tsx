import React from "react";
import { measureText } from "@remotion/layout-utils";
import { C, CONTENT, D, FONT, T } from "../brand/theme";
import { IconArrowFill, IconBack, IconClose, IconCup, IconSearch } from "../components/Icons";
import { Rect } from "../debugger/camera";

/*
 * Fictional shop «رَفّ» — search field + search suggestions + Arabic keyboard, designed at viewport width (960).
 * Illustrative only: always shown with the مثال توضيحي chip. Geometry (incl. measured text segments) is exported
 * so the debugger can outline exactly the emphasised part of each suggestion.
 */
export type Seg = { t: string; m?: boolean }; // m = matches what the user typed
/** Which part of a suggestion is emphasised. */
export type Emph = "match" | "rest" | "color" | "none";
export type Row = { segs: Seg[]; p: number; press?: number };
export type Results = { p: number; query: string; items: { name: string; off?: boolean }[]; offP?: number };
export type SearchState = {
  query: string;
  caret: boolean;
  rows: Row[];
  emphA: Emph; // emphasis before the change
  emphB: Emph; // emphasis after the change
  emphT: number; // 0..1 crossfade A → B
  keyboard: number; // 0..1
  results?: Results;
};

export const ZWJ = "‍";
const G = { side: 28, fieldY: 28, fieldH: 96, listY: 150, rowH: 96, kbH: 360 };
const W = CONTENT.w - G.side * 2;
const ROW_SIZE = 42;
const TEXT_RIGHT = CONTENT.w - G.side - 24 - 40 - 22; // right edge of suggestion text (after the search icon)

export const fieldRect: Rect = { x: G.side, y: G.fieldY, w: W, h: G.fieldH };
export const keyboardRect: Rect = { x: 0, y: CONTENT.h - G.kbH, w: CONTENT.w, h: G.kbH };
export const rowRect = (i: number): Rect => ({ x: G.side, y: G.listY + i * G.rowH, w: W, h: G.rowH });
export const rowsVisible = Math.floor((CONTENT.h - G.kbH - G.listY) / G.rowH);

const segStyle = (s: Seg, e: Emph): { weight: number; color: string } => {
  const strong = (e === "match" && s.m) || (e === "rest" && !s.m);
  if (e === "color" && s.m) return { weight: 500, color: D.brand };
  return { weight: strong ? 700 : 400, color: strong ? C.text : e === "none" ? C.text : "#3D4250" };
};
const widthOf = (t: string, weight: number) => measureText({ text: t.replace(/ /g, " "), fontFamily: FONT, fontSize: ROW_SIZE, fontWeight: String(weight) }).width;

/** Screen-content rect of segment `k` of row `i` under emphasis `e` (RTL: the first segment is rightmost). */
export const segRect = (i: number, segs: Seg[], k: number, e: Emph, pad = 4): Rect => {
  let right = TEXT_RIGHT;
  for (let j = 0; j < k; j++) right -= widthOf(segs[j].t, segStyle(segs[j], e).weight);
  const w = widthOf(segs[k].t.trim(), segStyle(segs[k], e).weight);
  const lead = segs[k].t.length - segs[k].t.trimStart().length > 0 ? widthOf(" ", segStyle(segs[k], e).weight) : 0;
  const r = rowRect(i);
  return { x: right - lead - w - pad, y: r.y + 18, w: w + pad * 2, h: r.h - 36 };
};
/** Rects of all matching (m) or non-matching segments of a row. */
export const partRects = (i: number, segs: Seg[], e: Emph, match: boolean): Rect[] =>
  segs.map((s, k) => ({ s, k })).filter(({ s }) => !!s.m === match && s.t.trim()).map(({ k }) => segRect(i, segs, k, e));

const Line: React.FC<{ segs: Seg[]; e: Emph; opacity: number }> = ({ segs, e, opacity }) => (
  <div style={{ position: "absolute", right: CONTENT.w - TEXT_RIGHT, top: 0, height: G.rowH, display: "flex", alignItems: "center", whiteSpace: "pre", fontSize: ROW_SIZE, opacity }}>
    {segs.map((s, k) => {
      const st = segStyle(s, e);
      return (
        <span key={k} style={{ fontWeight: st.weight, color: st.color }}>
          {s.t}
        </span>
      );
    })}
  </div>
);

const KB_ROWS = ["ض ص ث ق ف غ ع ه خ ح ج", "ش س ي ب ل ا ت ن م ك ط", "ئ ء ؤ ر لا ى ة و ز ظ د"];

const Keyboard: React.FC<{ p: number }> = ({ p }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: keyboardRect.y + (1 - p) * G.kbH, height: G.kbH, background: "#D5D8DE", padding: "16px 10px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12 }}>
    {KB_ROWS.map((r, i) => (
      <div key={i} style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {r.split(" ").map((k) => (
          <span key={k} style={{ width: 76, height: 60, borderRadius: 10, background: "#FFFFFF", boxShadow: "0 2px 0 rgba(23,26,33,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: C.text }}>{k}</span>
        ))}
      </div>
    ))}
    <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
      <span style={{ width: 150, height: 60, borderRadius: 10, background: "#AEB3BD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>123</span>
      <span style={{ width: 520, height: 60, borderRadius: 10, background: "#FFFFFF", boxShadow: "0 2px 0 rgba(23,26,33,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: C.textMuted }}>مسافة</span>
      <span style={{ width: 210, height: 60, borderRadius: 10, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 600 }}>بحث</span>
    </div>
  </div>
);

const ResultsPage: React.FC<{ r: Results }> = ({ r }) => (
  <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.surface, opacity: r.p, translate: `${(1 - r.p) * -60}px 0px` }}>
    <div style={{ position: "absolute", top: G.fieldY, right: G.side, left: G.side, height: G.fieldH, display: "flex", alignItems: "center", gap: 16 }}>
      <IconBack color={C.text} size={40} />
      <div style={{ flex: 1, height: G.fieldH, borderRadius: 22, background: C.surfaceAlt, display: "flex", alignItems: "center", gap: 14, padding: "0 26px", fontSize: 36, fontWeight: 600 }}>
        <IconSearch color={C.textMuted} size={34} />
        {r.query}
      </div>
    </div>
    <div style={{ position: "absolute", top: 150, right: 36, fontSize: 28, color: C.textMuted }}>نتايج «{r.query}»</div>
    {r.items.map((it, i) => {
      const off = it.off ? r.offP ?? 0 : 0;
      return (
        <div key={i} style={{ position: "absolute", top: 206 + Math.floor(i / 2) * 360, right: G.side + (i % 2) * (W / 2 + 10), width: W / 2 - 10, height: 340, borderRadius: 22, border: `2px solid ${C.border}`, boxSizing: "border-box", overflow: "hidden", background: C.surface }}>
          <div style={{ height: 220, background: off > 0.5 ? "#F1F2F5" : D.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconCup color={off > 0.5 ? C.textSubtle : D.brand} size={96} stroke={1.6} />
          </div>
          <div style={{ padding: "18px 22px", fontSize: 30, fontWeight: 600, lineHeight: 1.3, color: off > 0.5 ? C.textSubtle : C.text }}>{it.name}</div>
        </div>
      );
    })}
  </div>
);

export const SearchScreen: React.FC<{ s: SearchState }> = ({ s }) => (
  <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.surface, fontFamily: FONT, color: C.text }}>
    {/* search field */}
    <div style={{ position: "absolute", top: G.fieldY, right: G.side, width: W, height: G.fieldH, borderRadius: 22, border: `3px solid ${D.brand}`, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 16, padding: "0 26px" }}>
      <IconSearch color={C.textMuted} size={36} />
      <span style={{ fontSize: 42, fontWeight: 500, whiteSpace: "pre" }}>
        {s.query || <span style={{ color: C.textSubtle, fontWeight: 400 }}>دوّر في رَفّ…</span>}
      </span>
      <span style={{ width: 3, height: 46, background: D.brand, opacity: s.caret ? 1 : 0, marginRight: -10 }} />
      <span style={{ flex: 1 }} />
      {s.query ? <IconClose color={C.textSubtle} size={32} /> : null}
    </div>
    {/* suggestions */}
    {s.rows.map((r, i) => {
      const rr = rowRect(i);
      if (r.p <= 0) return null;
      return (
        <div key={i} style={{ position: "absolute", top: rr.y, right: G.side, width: W, height: G.rowH, opacity: r.p, translate: `0px ${(1 - r.p) * -10}px`, borderBottom: `1px solid ${C.border}`, background: `rgba(14,124,107,${0.08 * (r.press ?? 0)})`, borderRadius: 12 }}>
          <span style={{ position: "absolute", right: 24, top: G.rowH / 2 - 18, display: "flex" }}>
            <IconSearch color={C.textSubtle} size={36} />
          </span>
          <div style={{ position: "absolute", inset: 0, right: -G.side, left: -G.side }}>
            <Line segs={r.segs} e={s.emphA} opacity={1 - s.emphT} />
            {s.emphT > 0 ? <Line segs={r.segs} e={s.emphB} opacity={s.emphT} /> : null}
          </div>
          <span style={{ position: "absolute", left: 20, top: G.rowH / 2 - 16, display: "flex" }}>
            <IconArrowFill color={C.textSubtle} size={32} />
          </span>
        </div>
      );
    })}
    <Keyboard p={s.keyboard} />
    {s.results && s.results.p > 0 ? <ResultsPage r={s.results} /> : null}
  </div>
);

/** Closing question: the same mixed list with the match in bold (أ) or in colour (ب), plus the comment prompt. */
const CMP = { top: 30, cardH: 390, gap: 30 };
export const compareCardRect = (i: 0 | 1): Rect => ({ x: G.side, y: CMP.top + i * (CMP.cardH + CMP.gap), w: W, h: CMP.cardH });
export const compareCtaRect: Rect = { x: G.side, y: CMP.top + 2 * (CMP.cardH + CMP.gap), w: W, h: 104 };

export const EmphasisCompare: React.FC<{ rows: Seg[][]; a: number; b: number; selA: number; selB: number; cta: number }> = ({ rows, a, b, selA, selB, cta }) => (
  <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.workspace, fontFamily: FONT, color: C.text }}>
    {([0, 1] as const).map((i) => {
      const r = compareCardRect(i);
      const p = i === 0 ? a : b;
      const sel = i === 0 ? selA : selB;
      const e: Emph = i === 0 ? "match" : "color";
      return (
        <div key={i} style={{ position: "absolute", top: r.y, right: G.side, width: r.w, height: r.h, borderRadius: T.radius.lg, background: C.surface, border: `2px solid ${C.border}`, boxSizing: "border-box", boxShadow: "0 10px 28px rgba(23,26,33,0.07)", opacity: p, translate: `0px ${(1 - p) * 24}px`, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <span style={{ width: 56, height: 56, borderRadius: 16, background: sel > 0.5 ? C.select : C.selectSoft, color: sel > 0.5 ? C.selectText : C.select, fontSize: 32, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i === 0 ? "أ" : "ب"}</span>
            <span style={{ fontSize: 36, fontWeight: 700 }}>{i === 0 ? "المطابقة بالبولد" : "المطابقة بلون"}</span>
          </div>
          {rows.map((segs, k) => (
            <div key={k} style={{ height: 88, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 18 }}>
              <IconSearch color={C.textSubtle} size={34} />
              <span style={{ fontSize: 36, whiteSpace: "pre" }}>
                {segs.map((s, j) => {
                  const st = segStyle(s, e);
                  return <span key={j} style={{ fontWeight: st.weight, color: st.color }}>{s.t}</span>;
                })}
              </span>
            </div>
          ))}
        </div>
      );
    })}
    {cta > 0 ? (
      <div style={{ position: "absolute", top: compareCtaRect.y, right: G.side, width: W, height: compareCtaRect.h, borderRadius: T.radius.lg, background: C.text, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontSize: 36, fontWeight: 700, opacity: cta, translate: `0px ${(1 - cta) * 16}px` }}>
        أ ولا ب؟ اكتب اختيارك في الكومنتات
      </div>
    ) : null}
  </div>
);
