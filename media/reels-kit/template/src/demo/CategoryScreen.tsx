import React from "react";
import { C, CONTENT, D, FONT, T } from "../brand/theme";
import { IconBag, IconBall, IconCheck, IconChevron, IconDress, IconKid, IconSearch, IconShirt, IconSofa, IconSpark } from "../components/Icons";
import { Rect } from "../debugger/camera";

/*
 * Fictional shop "دُكّانة" — categories screen, designed at viewport width (960) so text reads large on mobile.
 * Illustrative only: always shown with the مثال توضيحي chip. Geometry is exported for cursors and selections.
 */
export const CATS = [
  { name: "رجالي", Icon: IconShirt, hint: "تيشيرتات، بناطيل، أحذية", subs: ["تيشيرتات", "بناطيل", "أحذية"] },
  { name: "حريمي", Icon: IconDress, hint: "فساتين، بلوزات، شنط", subs: [] },
  { name: "أطفال", Icon: IconKid, hint: "لبس، ألعاب", subs: [] },
  { name: "رياضة", Icon: IconBall, hint: "ملابس رياضية، أحذية، أدوات", subs: ["ملابس رياضية", "أحذية رياضية", "أدوات"] },
  { name: "جمال وعناية", Icon: IconSpark, hint: "مكياج، عناية بالبشرة", subs: [] },
  { name: "البيت", Icon: IconSofa, hint: "مطبخ، ديكور", subs: [] },
] as const;

const G = { listTop: 252, row: 104, hintExtra: 44, sub: 86, side: 28 };

export type CategoryState = {
  expand: Record<string, number>; // 0..1 per category
  hints: number; // 0..1 design change: one-line description under each category
  pressed: Record<string, number>; // 0..1 row press tint
  done?: { sub: string; p: number }; // success check on a sub-item
};

const rowH = (hints: number) => G.row + G.hintExtra * hints;

/** Row rect (content coords) of a category. */
export const rowRect = (name: string, s: CategoryState): Rect => {
  let y = G.listTop;
  for (const c of CATS) {
    if (c.name === name) return { x: G.side, y, w: CONTENT.w - G.side * 2, h: rowH(s.hints) };
    y += rowH(s.hints) + c.subs.length * G.sub * (s.expand[c.name] ?? 0);
  }
  throw new Error(`unknown category ${name}`);
};

/** Sub-item rect (content coords). */
export const subRect = (parent: string, sub: string, s: CategoryState): Rect => {
  const r = rowRect(parent, s);
  const c = CATS.find((x) => x.name === parent)!;
  const i = (c.subs as readonly string[]).indexOf(sub);
  return { x: G.side + 70, y: r.y + r.h + i * G.sub, w: CONTENT.w - G.side * 2 - 70, h: G.sub };
};

export const centerOf = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

export const CategoryScreen: React.FC<{ s: CategoryState }> = ({ s }) => (
  <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.surface, fontFamily: FONT, color: C.text }}>
    {/* app bar */}
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 118, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ rotate: "180deg", display: "flex" }}><IconChevron dir="start" color={C.text} size={40} /></span>
        <span style={{ fontSize: T.type.productTitle, fontWeight: 700 }}>الأقسام</span>
      </div>
      <IconBag color={C.text} size={40} />
    </div>
    {/* search */}
    <div style={{ position: "absolute", top: 126, left: G.side, right: G.side, height: 92, borderRadius: T.radius.md, background: C.surfaceAlt, display: "flex", alignItems: "center", gap: 16, padding: "0 28px", color: C.textSubtle, fontSize: T.type.productSub }}>
      <IconSearch color={C.textSubtle} size={34} /> دوّر على منتج…
    </div>
    {CATS.map((c) => {
      const r = rowRect(c.name, s);
      const e = s.expand[c.name] ?? 0;
      const pr = s.pressed[c.name] ?? 0;
      return (
        <React.Fragment key={c.name}>
          <div style={{ position: "absolute", top: r.y, right: G.side, width: r.w, height: r.h, display: "flex", alignItems: "center", gap: 24, padding: "0 20px", boxSizing: "border-box", borderBottom: `1px solid ${C.border}`, background: `rgba(14,124,107,${0.07 * pr})`, borderRadius: 16 }}>
            <div style={{ width: 66, height: 66, borderRadius: 20, background: D.brandSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <c.Icon color={D.brand} size={36} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: T.type.productRow, fontWeight: 600, lineHeight: 1.2 }}>{c.name}</div>
              {s.hints > 0 ? (
                <div style={{ fontSize: T.type.productMeta, lineHeight: "40px", color: C.textMuted, marginTop: 2, opacity: s.hints, height: 42 * s.hints, overflow: "visible", whiteSpace: "nowrap", translate: `0px ${(1 - s.hints) * -10}px` }}>{c.hint}</div>
              ) : null}
            </div>
            <span style={{ display: "flex", rotate: c.subs.length ? `${-90 + 90 * e}deg` : "0deg" }}>
              <IconChevron dir="down" color={C.textSubtle} size={34} />
            </span>
          </div>
          {c.subs.length && e > 0 ? (
            <div style={{ position: "absolute", top: r.y + r.h, right: G.side, width: r.w, height: c.subs.length * G.sub * e, overflow: "hidden" }}>
              {c.subs.map((sub, k) => {
                const d = s.done && s.done.sub === sub ? s.done.p : 0;
                return (
                  <div key={sub} style={{ position: "absolute", top: k * G.sub, right: 90, left: 20, height: G.sub, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: T.type.productSub, color: d > 0.5 ? D.brand : C.textMuted, fontWeight: d > 0.5 ? 700 : 400, opacity: Math.max(0, Math.min(1, e * 2 - k * 0.3)) }}>
                    <span>{sub}</span>
                    {d > 0 ? (
                      <span style={{ width: 52, height: 52, borderRadius: 26, background: D.brand, display: "flex", alignItems: "center", justifyContent: "center", scale: String(0.5 + 0.5 * d), opacity: d }}>
                        <IconCheck color={D.onBrand} size={32} stroke={3} />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </React.Fragment>
      );
    })}
  </div>
);
