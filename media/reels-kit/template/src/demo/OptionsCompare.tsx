import React from "react";
import { C, CONTENT, D, FONT, T } from "../brand/theme";
import { IconCalendar, IconCheck, IconComment, IconPen } from "../components/Icons";
import { Rect } from "../debugger/camera";

/*
 * Closing comparison for the episode question: two versions of the same date field, side by side vertically.
 * A = the AI suggests a date and asks for confirmation; B = the date stays empty until the user sets it.
 */
const G = { side: 28, top: 40, cardH: 330, gap: 40 };
const W = CONTENT.w - G.side * 2;
export const optionRect = (i: 0 | 1): Rect => ({ x: G.side, y: G.top + i * (G.cardH + G.gap), w: W, h: G.cardH });
export const ctaRect: Rect = { x: G.side, y: G.top + 2 * (G.cardH + G.gap) + 10, w: W, h: 110 };

const Card: React.FC<{ i: 0 | 1; p: number; sel: number; letter: string; title: string; children: React.ReactNode }> = ({ i, p, sel, letter, title, children }) => {
  const r = optionRect(i);
  return (
    <div style={{ position: "absolute", top: r.y, right: CONTENT.w - r.x - r.w, width: r.w, height: r.h, borderRadius: T.radius.lg, background: C.surface, border: `2px solid ${C.border}`, boxSizing: "border-box", boxShadow: "0 10px 28px rgba(23,26,33,0.07)", opacity: p, translate: `0px ${(1 - p) * 24}px`, padding: "26px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
        <span style={{ width: 56, height: 56, borderRadius: 16, background: sel > 0.5 ? C.select : C.selectSoft, color: sel > 0.5 ? C.selectText : C.select, fontSize: 32, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{letter}</span>
        <span style={{ fontSize: 36, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: 84, borderTop: `1px solid ${C.border}` }}>
        <IconCalendar color={C.textMuted} size={34} />
        <span style={{ width: 130, fontSize: 30, color: C.textMuted }}>الموعد</span>
        {children}
      </div>
    </div>
  );
};

const Btn: React.FC<{ primary?: boolean; children: React.ReactNode; w: number }> = ({ primary, children, w }) => (
  <span style={{ width: w, height: 76, borderRadius: 18, background: primary ? D.brand : C.surface, color: primary ? D.onBrand : D.brand, border: primary ? "none" : `2px solid ${D.brand}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 30, fontWeight: 700 }}>{children}</span>
);

export const OptionsCompare: React.FC<{ a: number; b: number; selA: number; selB: number; cta: number }> = ({ a, b, selA, selB, cta }) => (
  <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.workspace, fontFamily: FONT, color: C.text }}>
    <Card i={0} p={a} sel={selA} letter="أ" title="يقترح موعد ويطلب تأكيده">
      <span style={{ fontSize: 34, fontWeight: 700 }}>الخميس</span>
      <span style={{ marginRight: 16, padding: "6px 18px", borderRadius: 999, border: `2px dashed ${C.warning}`, background: C.warningSoft, color: C.warning, fontSize: 26, fontWeight: 700 }}>موعد مقترح</span>
    </Card>
    {a > 0 ? (
      <div style={{ position: "absolute", top: optionRect(0).y + 222, right: G.side + 28, left: G.side + 28, display: "flex", gap: 16, opacity: a }}>
        <Btn primary w={300}><IconCheck color={D.onBrand} size={30} stroke={3} />تأكيد</Btn>
        <Btn w={300}><IconPen color={D.brand} size={30} />تعديل</Btn>
      </div>
    ) : null}
    <Card i={1} p={b} sel={selB} letter="ب" title="يسيب التاريخ فاضي">
      <span style={{ fontSize: 34, fontWeight: 600, color: C.textSubtle }}>—</span>
    </Card>
    {b > 0 ? (
      <div style={{ position: "absolute", top: optionRect(1).y + 222, right: G.side + 28, display: "flex", gap: 16, opacity: b }}>
        <Btn w={360}><IconCalendar color={D.brand} size={30} />حدّد الموعد</Btn>
      </div>
    ) : null}
    {cta > 0 ? (
      <div style={{ position: "absolute", top: ctaRect.y, right: G.side, width: W, height: ctaRect.h, borderRadius: T.radius.lg, background: C.text, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontSize: 36, fontWeight: 700, opacity: cta, translate: `0px ${(1 - cta) * 16}px` }}>
        <IconComment color="#FFFFFF" size={40} />
        أ ولا ب؟ اكتب اختيارك في الكومنتات
      </div>
    ) : null}
  </div>
);
