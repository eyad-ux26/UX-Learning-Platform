import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection, Tag } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconAlert, IconCheck, IconClock, IconClose, IconLock, IconPlay } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";
import { CaseChip, clipFrames, IntroCard, L, ListCard, loc, mid, PH, PhoneFrame, phoneRect, Presenter, RecapCard, SideNote, Strike, TitleBand, v, Voice, wi } from "./p14";

/*
 * P14-C02 re-edit: WP 18 "bottom sheet" (whole video, 0–192.7 s). An illustrative shop app (and a map and a music app
 * for the non-modal and expandable types) acts out each point; Eyad's voice and camera are kept.
 */
const VOICE = 192.69;
export const C02_FRAMES = clipFrames(VOICE);

const TALL = 62;
const SHORT = 330;
const sheetRect = (top: number): Rect => L(0, top, PH.w, PH.h - top);
const handleRect = (top: number): Rect => L(PH.w / 2 - 30, top + 6, 60, 22);
const closeRect = (top: number): Rect => L(12, top + 30, 40, 40);
const outsideRect = L(40, 120, 220, 60);
const statusRect = L(0, 0, PH.w, 26);
const stripRect = L(10, PH.h - 76, PH.w - 20, 64);
const MAP_SHEET = 360;

const PRODUCTS: [string, string, string][] = [
  ["سمّاعة لاسلكية", "1,200 ج.م", "#C9E8E1"],
  ["شاحن سريع", "350 ج.م", "#F4DCC2"],
  ["حافظة هاتف", "180 ج.م", "#DCD8F4"],
  ["ساعة ذكية", "2,400 ج.م", "#F6D6D6"],
];

type Kind = "options" | "flow" | "share" | "details" | "review" | "product" | "calendar" | "place" | "player";

const Row: React.FC<{ t: string; sub?: string; dot?: string }> = ({ t, sub, dot }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, height: 52, borderTop: `1px solid ${C.border}` }}>
    {dot ? <span style={{ width: 30, height: 30, borderRadius: 9, background: dot, flexShrink: 0 }} /> : null}
    <span style={{ fontSize: 16, fontWeight: 600, color: C.text, flex: 1 }}>{t}</span>
    {sub ? <span style={{ fontSize: 14, color: C.textMuted }}>{sub}</span> : null}
  </div>
);
const Big: React.FC<{ t: string; color?: string }> = ({ t, color }) => (
  <div style={{ marginTop: 14, height: 46, borderRadius: 12, background: color ?? D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>{t}</div>
);

const SheetBody: React.FC<{ kind: Kind; step: number }> = ({ kind, step }) => {
  if (kind === "options")
    return (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 8 }}>ترتيب وفلترة</div>
        {["الأحدث", "الأقل سعرًا", "الأعلى تقييمًا", "متوفر الآن", "شحن مجاني", "خصومات", "ماركات", "الألوان"].map((t) => (
          <Row key={t} t={t} sub="›" />
        ))}
      </>
    );
  if (kind === "flow")
    return (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>إتمام الطلب</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {["العنوان", "الدفع", "المراجعة"].map((t, i) => (
            <div key={t} style={{ flex: 1, height: 30, borderRadius: 999, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: i <= step ? D.brand : C.surfaceAlt, color: i <= step ? D.onBrand : C.textMuted }}>{i < step ? "✓ " : ""}{t}</div>
          ))}
        </div>
        <div style={{ fontSize: 14, color: C.textMuted, marginTop: 14 }}>خطوة {step + 1} من 3</div>
        {(step === 0 ? ["المدينة", "الشارع", "رقم المبنى"] : ["رقم البطاقة", "تاريخ الانتهاء", "CVV"]).map((t) => (
          <div key={t} style={{ marginTop: 10, height: 44, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: C.textMuted, boxSizing: "border-box" }}>{t}</div>
        ))}
        <Big t="التالي" />
      </>
    );
  if (kind === "share")
    return (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 6 }}>سمّاعة لاسلكية</div>
        <Row t="مشاركة المنتج" />
        <Row t="أضف إلى المفضّلة" />
        <Row t="أبلغ عن مشكلة" />
      </>
    );
  if (kind === "details")
    return (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 6 }}>تفاصيل التوصيل</div>
        <Row t="يصل خلال" sub="2–3 أيام" />
        <Row t="الشحن" sub="50 ج.م" />
        <Row t="الإرجاع" sub="خلال 14 يومًا" />
      </>
    );
  if (kind === "review")
    return (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>اكتب تقييمًا</div>
        <div dir="ltr" style={{ marginTop: 8, fontSize: 28, color: "#F2B530", textAlign: "center" }}>★★★★☆</div>
        <div style={{ marginTop: 8, height: 60, borderRadius: 10, border: `2px solid ${C.border}`, padding: 10, fontSize: 15, color: C.textMuted, boxSizing: "border-box" }}>صوت ممتاز…</div>
        <Big t="نشر" />
      </>
    );
  if (kind === "product")
    return (
      <>
        <div style={{ height: 120, borderRadius: 14, background: "#C9E8E1" }} />
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginTop: 10 }}>سمّاعة لاسلكية · 1,200 ج.م</div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {["المنتج", "السلة", "الدفع", "التأكيد"].map((t, i) => (
            <div key={t} style={{ flex: 1, height: 28, borderRadius: 999, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: i === 0 ? D.brand : C.surfaceAlt, color: i === 0 ? D.onBrand : C.textMuted }}>{t}</div>
          ))}
        </div>
        <Big t="اشترِ الآن" />
      </>
    );
  if (kind === "place")
    return (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>مقهى الزمالك</div>
        <div style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>★ 4.6 · مفتوح الآن · 1.2 كم</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {["الاتجاهات", "اتصال", "حفظ"].map((t, i) => (
            <div key={t} style={{ flex: 1, height: 40, borderRadius: 999, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: i === 0 ? D.brand : D.brandSoft, color: i === 0 ? D.onBrand : D.brand }}>{t}</div>
          ))}
        </div>
      </>
    );
  if (kind === "player")
    return (
      <>
        <div style={{ height: 150, borderRadius: 16, background: "linear-gradient(135deg,#7B61FF,#E46BB3)" }} />
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginTop: 12 }}>نسيم الصباح</div>
        <div style={{ fontSize: 14, color: C.textMuted }}>فرقة المدينة</div>
        <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: C.border }}><div style={{ width: "40%", height: 6, borderRadius: 3, background: D.brand }} /></div>
        <div dir="ltr" style={{ display: "flex", justifyContent: "center", gap: 26, marginTop: 14, fontSize: 26, color: C.text }}><span>⏮</span><span>⏸</span><span>⏭</span></div>
        <Row t="أضف إلى قائمة" />
        <Row t="شارك الأغنية" />
      </>
    );
  return (
    <>
      <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>اختر التاريخ والوقت</div>
      <div dir="ltr" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 12 }}>
        {Array.from({ length: 28 }, (_, i) => (
          <div key={i} style={{ height: 28, borderRadius: 8, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", background: i === 15 ? D.brand : C.surfaceAlt, color: i === 15 ? D.onBrand : C.text }}>{i + 1}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {["10:00", "12:30", "4:00"].map((t, i) => (
          <div key={t} dir="ltr" style={{ flex: 1, height: 34, borderRadius: 10, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${i === 1 ? D.brand : C.border}`, color: i === 1 ? D.brand : C.text, boxSizing: "border-box" }}>{t}</div>
        ))}
      </div>
      <Big t="التالي: بيانات الحجز" />
    </>
  );
};

type St = { screen: "shop" | "map" | "music"; sheet: number; kind: Kind; top: number; scrim: number; close?: number; drawer?: number; step?: number; strike?: number; strip?: number; mapShift?: number; full?: number };

const Screen: React.FC<{ st: St }> = ({ st }) => {
  const top = st.full ? st.top - (st.top - 0) * st.full : st.top;
  const r = sheetRect(top);
  const off = (1 - st.sheet) * (PH.h - top + 20);
  const dr = st.drawer ?? 0;
  return (
    <>
      <div style={{ ...loc(statusRect), background: st.screen === "map" ? "#DCE8DF" : D.brand, color: st.screen === "map" ? C.text : D.onBrand, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", zIndex: 2 }}>
        <span dir="ltr">9:41</span>
        <span dir="ltr">▮▮▮ ◔</span>
      </div>
      {st.screen === "shop" ? (
        <>
          <div style={{ position: "absolute", top: 26, left: 0, right: 0, height: 52, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", padding: "0 18px", fontSize: 22, fontWeight: 700 }}>متجري</div>
          {PRODUCTS.map(([t, p, c], i) => (
            <div key={t} style={{ position: "absolute", left: 14, right: 14, top: 90 + 96 * i, height: 84, borderRadius: 14, background: C.surfaceAlt, padding: 12, display: "flex", gap: 12, alignItems: "center", boxSizing: "border-box" }}>
              <div style={{ width: 60, height: 60, borderRadius: 12, background: c, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{t}</div>
                <div style={{ fontSize: 16, color: D.brand, fontWeight: 700, marginTop: 4 }}>{p}</div>
              </div>
            </div>
          ))}
        </>
      ) : st.screen === "map" ? (
        <div style={{ position: "absolute", inset: 0, background: "#E6EEE8", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: -60, translate: `${st.mapShift ?? 0}px ${(st.mapShift ?? 0) * 0.4}px` }}>
            {[80, 200, 320, 440].map((y) => <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y, height: 14, background: "#FFFFFF" }} />)}
            {[90, 230, 330].map((x) => <div key={x} style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 14, background: "#FFFFFF" }} />)}
            <div style={{ position: "absolute", left: 150, top: 120, width: 120, height: 70, borderRadius: 10, background: "#CFE3D3" }} />
            <div style={{ position: "absolute", left: 238, top: 236, width: 26, height: 26, borderRadius: "50% 50% 50% 0", rotate: "-45deg", background: "#E5484D", border: "3px solid #FFFFFF" }} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", top: 26, left: 0, right: 0, height: 52, background: "#2B2F3A", color: "#FFFFFF", display: "flex", alignItems: "center", padding: "0 18px", fontSize: 22, fontWeight: 700 }}>موسيقاي</div>
          {["قائمة الصباح", "أغانٍ هادئة", "للطريق", "الأكثر استماعًا"].map((t, i) => (
            <div key={t} style={{ position: "absolute", left: 14, right: 14, top: 90 + 84 * i, height: 72, borderRadius: 14, background: C.surfaceAlt, padding: "0 12px", display: "flex", gap: 12, alignItems: "center", boxSizing: "border-box" }}>
              <div style={{ width: 50, height: 50, borderRadius: 10, background: ["#D9D2FF", "#FFD6E8", "#CDEBFF", "#FFE7C2"][i] }} />
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{t}</div>
            </div>
          ))}
          {(st.strip ?? 0) > 0 ? (
            <div style={{ ...loc(stripRect), borderRadius: 14, background: "#2B2F3A", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 12, padding: "0 12px", opacity: st.strip }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#7B61FF,#E46BB3)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>نسيم الصباح</div>
                <div style={{ fontSize: 12, color: "#B8BDC8" }}>فرقة المدينة</div>
              </div>
              <IconPlay color="#FFFFFF" size={26} />
            </div>
          ) : null}
        </>
      )}
      {st.scrim > 0 ? <div style={{ position: "absolute", inset: 0, background: "rgba(16,18,24,0.45)", opacity: st.scrim * st.sheet }} /> : null}
      {st.sheet > 0 ? (
        <div style={{ ...loc(r), translate: `0px ${off}px`, background: "#FFFFFF", borderRadius: (st.full ?? 0) > 0.9 ? 0 : "22px 22px 0 0", boxShadow: "0 -10px 30px rgba(0,0,0,0.18)", padding: "36px 18px 18px", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 12, left: PH.w / 2 - 22, width: 44, height: 5, borderRadius: 3, background: C.border }} />
          {(st.close ?? 0) > 0 ? (
            <div style={{ position: "absolute", top: 30, left: 12, width: 40, height: 40, borderRadius: 20, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", opacity: st.close, scale: String(0.6 + 0.4 * (st.close ?? 0)) }}>
              <IconClose color={C.text} size={22} stroke={2.6} />
            </div>
          ) : null}
          <SheetBody kind={st.kind} step={st.step ?? 0} />
        </div>
      ) : null}
      <Strike r={r} p={st.strike ?? 0} />
      {dr > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300, translate: `0px ${(dr - 1) * 300}px`, background: "#1E2129", color: "#FFFFFF", padding: "18px 16px", boxSizing: "border-box", borderRadius: "0 0 22px 22px", zIndex: 3 }}>
          <div dir="ltr" style={{ fontSize: 34, fontWeight: 700 }}>9:41</div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ width: 44, height: 44, borderRadius: 22, background: i < 2 ? "#4C8DF6" : "#3A3F4B" }} />)}
          </div>
          <div style={{ marginTop: 16, borderRadius: 14, background: "#2C303A", padding: "12px 14px", fontSize: 15, lineHeight: 1.5 }}>
            <b>رسالة جديدة</b>
            <div style={{ color: "#B8BDC8" }}>هل وصلك الطلب؟</div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export const C02: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    open: v(1.0), mobile: v(4.74), anchored: v(10.92), down: v(16.5), up: v(19.4), content: v(20.98), common: v(28.14),
    modal: v(30.98), behind: v(38.0), scrimNote: v(43.68),
    nonModal: v(49.28), mapNote: v(56.58), pan: v(58.0), nmNote: v(68.94),
    exp: v(74.7), expTap: v(84.6), expFull: v(92.0), expBack: v(96.0),
    g: v(98.0), tall: v(105.6), drag: v(111.0), drawer: v(114.0), drawerNote: v(115.9), drawerUp: v(121.0), lost: v(123.44), need: v(128.16), x: v(134.56), xNote: v(136.72), xTap: v(141.4), easy: v(142.2),
    flow: v(144.82), flowNote: v(145.6), step2: v(149.0), out: v(153.4), nav: v(159.14), gone: v(162.66),
    short: v(168.66), u1: v(169.6), u2: v(173.8), u3: v(176.0),
    product: v(177.36), prodNote: v(178.2), strike1: v(182.6), cal: v(186.88), calNote: v(187.4), strike2: v(189.8),
  };
  const END = v(VOICE) + 6;

  // ---- product state ------------------------------------------------------------------------
  let st: St;
  if (f < B.modal) st = { screen: "shop", kind: "share", top: SHORT, scrim: 1, sheet: enter(f, B.open, 14) * exit(f, B.down, 14) + enter(f, B.up, 14) * (f >= B.up ? 1 : 0) };
  else if (f < B.nonModal) st = { screen: "shop", kind: "details", top: SHORT, scrim: 1, sheet: enter(f, B.modal - 2, 14) * exit(f, B.nonModal - 12, 10) };
  else if (f < B.exp) st = { screen: "map", kind: "place", top: MAP_SHEET, scrim: 0, sheet: enter(f, B.nonModal, 14) * exit(f, B.exp - 10, 10), mapShift: Math.sin(Math.max(0, f - B.pan) / 40) * 30 * span(f, B.pan, B.nmNote + 60, 10) };
  else if (f < B.g) st = { screen: "music", kind: "player", top: 120, scrim: 0, strip: enter(f, B.exp, 12) * exit(f, B.expTap + 6, 6) + enter(f, B.expBack + 8, 10), sheet: enter(f, B.expTap, 12) * exit(f, B.expBack, 10), full: span(f, B.expFull, B.expBack, 14) };
  else if (f < B.flow) st = { screen: "shop", kind: "options", top: TALL, scrim: 1, sheet: enter(f, B.g, 14) * exit(f, B.xTap + 4, 12), close: enter(f, B.x, 12), drawer: enter(f, B.drawer - 8, 16) * exit(f, B.drawerUp, 14) };
  else if (f < B.short) st = { screen: "shop", kind: "flow", top: TALL + 40, scrim: 1, sheet: enter(f, B.flow, 14) * exit(f, B.out + 2, 12), step: f >= B.step2 ? 1 : 0 };
  else if (f < B.product) {
    const kinds: Kind[] = ["details", "share", "review"];
    const i = f < B.u2 ? 0 : f < B.u3 ? 1 : 2;
    const a = [B.u1 - 10, B.u2, B.u3][i];
    const b = [B.u2, B.u3, B.product][i];
    st = { screen: "shop", kind: kinds[i], top: SHORT - (i === 2 ? 20 : 0), scrim: 1, sheet: enter(f, a, 12) * exit(f, b - 10, 10) };
  } else if (f < B.cal) st = { screen: "shop", kind: "product", top: TALL + 50, scrim: 1, sheet: enter(f, B.product, 14) * exit(f, B.cal - 10, 10), strike: (f - B.strike1) / 12 };
  else st = { screen: "shop", kind: "calendar", top: TALL + 50, scrim: 1, sheet: enter(f, B.cal, 14), strike: (f - B.strike2) / 12 };

  const cuts = [B.nonModal, B.exp, B.g];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));

  // ---- camera -----------------------------------------------------------------------------
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const top = (at: number): Shot => ({ f: at, s: 1.18, fx: PH.x + PH.w / 2, fy: PH.y, cx: 770, cy: 12 });
  const bottom = (at: number): Shot => ({ f: at, s: 1.12, fx: PH.x + PH.w / 2, fy: PH.y + PH.h, cx: 770, cy: CONTENT.h - 10 });
  const shots: Shot[] = [{ f: 0, ...overview }, bottom(B.exp + 10), { f: B.expTap + 4, ...overview }, top(B.drag - 20), { f: B.need, ...overview }, top(B.x - 4), { f: B.easy, ...overview }];
  const cam = cameraAt(f, shots);

  const compare = (f >= B.x && f < B.flow) || (f >= B.short && f < B.product);
  const mode: DebugMode = f < B.mobile ? "live" : compare ? "compare" : "inspect";
  const address = st.screen === "map" ? "maps.app" : st.screen === "music" ? "music.app" : "shop.app";

  const dim = Math.max(span(f, B.modal + 10, B.nonModal - 10), span(f, B.tall, B.need), span(f, B.flowNote, B.short - 6), span(f, B.prodNote, END)) * 0.9;

  // ---- pointers ---------------------------------------------------------------------------
  const pt = (r: Rect, at: number) => camPoint(mid(r), cameraAt(at, shots));
  const tap = (at: number, r: Rect, dx: number, dy: number) => {
    const p = pt(r, at);
    return { keys: [{ f: at - 22, x: p.x + dx, y: p.y + dy }, { f: at, ...p, click: true }, { f: at + 26, ...p }] as Key[], from: at - 24, to: at + 36 };
  };
  const handle = pt(handleRect(TALL), B.drag);
  const status = pt(statusRect, B.drawer);
  const mapP = pt(L(150, 160, 20, 20), B.pan);
  const touches = [
    { keys: [{ f: B.drag - 20, x: handle.x - 40, y: handle.y + 140 }, { f: B.drag, ...handle, click: true }, { f: B.drag + 14, x: status.x + 10, y: status.y }, { f: B.drawer + 6, x: status.x + 20, y: status.y + 240 }, { f: B.drawer + 40, x: status.x + 20, y: status.y + 240 }] as Key[], from: B.drag - 22, to: B.drawer + 48 },
    { keys: [{ f: B.pan - 16, x: mapP.x - 30, y: mapP.y + 80 }, { f: B.pan, ...mapP, click: true }, { f: B.pan + 50, x: mapP.x + 40, y: mapP.y + 16 }, { f: B.pan + 90, x: mapP.x - 30, y: mapP.y - 10 }] as Key[], from: B.pan - 18, to: B.pan + 100 },
    tap(B.behind, L(40, 140, 220, 60), -50, 120),
    tap(B.expTap, stripRect, -40, -120),
    tap(B.xTap, closeRect(TALL), 60, 140),
    tap(B.out, outsideRect, -40, 120),
  ];
  const behindTag = pt(L(40, 210, 0, 0), B.behind);
  const outTag = camPoint({ x: outsideRect.x, y: outsideRect.y + 90 }, cameraAt(B.out, shots));

  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      <Selection r={camRect(sheetRect(SHORT), cam)} hover={sel(B.mobile, B.down)} selected={sel(B.mobile, B.down)} label="Bottom sheet" />
      <SideNote y={110} text="على الموبايل فقط" p={span(f, B.mobile, B.anchored)} />
      <SideNote y={230} text="لا تُستخدم عادةً على الـ Desktop أو الـ Tablet" p={span(f, B.mobile + 30, B.anchored)} />
      <SideNote y={110} text="مثبّتة في أسفل الشاشة: تظهر من تحت وتنزل لتحت" p={span(f, B.anchored, B.content)} />
      <SideNote y={110} text="تعرض تفاصيل، أو Actions إضافية" p={span(f, B.content, B.modal)} />

      <CaseChip y={40} text="Modal bottom sheet" p={span(f, B.modal, B.nonModal)} />
      <SideNote y={110} text="تعزل الخلفية، فلا يتفاعل المستخدم إلا معها" p={span(f, B.modal + 6, B.nonModal)} icon={wi(IconLock)} />
      <Tag r={{ x: 0, y: behindTag.y, w: 0, h: 0 }} x={behindTag.x - 60} text="لا شيء يحدث" tone="warn" progress={span(f, B.behind + 4, B.scrimNote)} />
      <Selection r={camRect(L(0, 0, PH.w, SHORT), cam)} hover={sel(B.scrimNote, B.nonModal - 10)} selected={sel(B.scrimNote, B.nonModal - 10)} label="Scrim" />
      <SideNote y={280} text="الـ Scrim: طبقة شفافة تفصل الخلفية" p={span(f, B.scrimNote, B.nonModal)} />

      <CaseChip y={40} text="Non-modal bottom sheet" p={span(f, B.nonModal, B.exp)} />
      <SideNote y={110} text="الخريطة تبقى متاحة مع الـ Sheet" p={span(f, B.mapNote, B.exp)} icon={wi(IconCheck)} />
      <Selection r={camRect(sheetRect(MAP_SHEET), cam)} hover={sel(B.nonModal + 20, B.exp - 10)} selected={sel(B.nonModal + 20, B.exp - 10)} label="Non-modal" />
      <SideNote y={260} text="يتفاعل مع الاثنين، ولا يُعزل عن الصفحة" p={span(f, B.nmNote, B.exp)} />

      <CaseChip y={40} text="Expandable bottom sheet" p={span(f, B.exp, B.g)} />
      <Selection r={camRect(stripRect, cam)} hover={sel(B.exp + 20, B.expTap)} selected={sel(B.exp + 20, B.expTap)} label="شريط صغير" />
      <SideNote y={110} text="تبدأ شريطًا صغيرًا في الأسفل" p={span(f, B.exp + 10, B.g)} />
      <SideNote y={250} text="وتتّسع عند الضغط لتفاصيل و Actions أكثر" p={span(f, B.expTap + 10, B.g)} />
      <SideNote y={390} text="وقد تأخذ الشاشة كلها" p={span(f, B.expFull, B.g)} />

      <CaseChip y={40} text="Guideline 1" p={span(f, B.g, B.flow)} />
      <Selection r={camRect(sheetRect(TALL), cam)} hover={sel(B.tall - 10, B.drag - 20)} selected={sel(B.tall - 10, B.drag - 20)} label="Bottom sheet" />
      <SideNote y={110} text="Bottom sheet طويلة تصل تقريبًا لأعلى الشاشة" p={span(f, B.tall, B.drawerNote)} />
      <SideNote y={110} text="السحب لأسفل فتح لوحة الإشعارات" p={span(f, B.drawerNote, B.need)} warn icon={wi(IconAlert)} />
      <SideNote y={280} text="ولم تُغلق الـ Sheet: المستخدم يتشتّت" p={span(f, B.lost, B.need)} warn />
      <SideNote y={110} text="يحتاج طريقة أخرى للإغلاق غير السحب" p={span(f, B.need, B.easy)} />
      <Selection r={camRect(closeRect(TALL), cam)} hover={sel(B.xNote, B.xTap)} selected={sel(B.xNote, B.xTap)} label="Close button" />
      <SideNote y={280} text="أضف زر ✕ واضحًا" p={span(f, B.xNote, B.easy)} big icon={wi(IconClose)} />
      <SideNote y={200} text="تُغلق بسهولة، دون سحب" p={span(f, B.easy, B.flow)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="Guideline 2" p={span(f, B.flow, B.short)} warn />
      <Selection r={camRect(sheetRect(TALL + 40), cam)} hover={sel(B.flowNote, B.out)} selected={sel(B.flowNote, B.out)} label="Bottom sheet" />
      <SideNote y={110} text="خطأ شائع: Flow كامل داخل Bottom sheet" p={span(f, B.flowNote, B.short)} warn icon={wi(IconAlert)} />
      <Tag r={{ x: 0, y: outTag.y, w: 0, h: 0 }} x={outTag.x} text="أُغلقت بالخطأ" tone="warn" progress={span(f, B.out + 10, B.nav + 20)} />
      <SideNote y={280} text="التنقل بين الخطوات صعب" p={span(f, B.nav, B.gone)} />
      <SideNote y={280} text="وكل الخطوات قد تضيع بخطأ واحد" p={span(f, B.gone, B.short)} warn />

      <SideNote y={110} text="Bottom sheet للتفاعلات القصيرة" p={span(f, B.short, B.product)} big icon={wi(IconClock)} />
      <ListCard y={272} p={span(f, B.u1 - 6, B.product)} items={[{ text: "عرض تفاصيل", p: enter(f, B.u1) }, { text: "تنفيذ Action", p: enter(f, B.u2) }, { text: "كتابة منشور قصير", p: enter(f, B.u3) }]} />

      <SideNote y={110} text="ليست لـ Flow: منتج ثم Checkout" p={span(f, B.prodNote, END)} warn />
      <SideNote y={270} text="ولا لتقويم وحجز موعد بخطوات" p={span(f, B.calNote, END)} warn />

      {touches.map((t, i) => (
        <UserTouch key={i} frame={f} keys={t.keys} from={t.from} to={t.to} />
      ))}
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={address} illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>
            <Screen st={st} />
          </PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c02/cam.mp4" />
      <TitleBand title="متى تناسبك الـ Bottom sheet؟" sub="Bottom sheet" />
      <Voice src="c02/voice.m4a" />
      <IntroCard title="الـ Bottom sheet: أنواعها ومتى تستخدمها" sub="Bottom sheet" points={["Modal · Non-modal · Expandable", "خطآن شائعان"]} />
      <RecapCard
        voiceSec={VOICE}
        title="الـ Bottom sheet للتفاعلات القصيرة"
        items={[
          { text: "تفاصيل، أو Action، أو منشور قصير" },
          { text: "زر ✕ واضح حين تكون طويلة" },
          { text: "إغلاقها بالسحب فقط في Sheet طويلة", no: true },
          { text: "Flow كامل بخطوات، مثل Checkout أو حجز موعد", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
