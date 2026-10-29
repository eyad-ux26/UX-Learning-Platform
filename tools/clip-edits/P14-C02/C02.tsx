import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C, CONTENT, D, FONT, T } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection, Tag } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconAlert, IconCheck, IconClose, IconClock } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";

/*
 * P14-C02 re-edit: WP 18 "bottom sheet guidelines" (98–193 s). The slides are replaced by an illustrative shop app in
 * one phone; Eyad's voice and camera are kept. Beat times are the clip's caption timings (seconds).
 */
const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
export const C02_FRAMES = s(94.6);

// ---- product geometry (content coordinates; the phone's own layout is in local pixels) ------------
const PH = { x: 640, y: 22, w: 300, h: 582 };
const L = (x: number, y: number, w: number, h: number): Rect => ({ x: PH.x + x, y: PH.y + y, w, h });
const loc = (r: Rect): React.CSSProperties => ({ position: "absolute", left: r.x - PH.x, top: r.y - PH.y, width: r.w, height: r.h, boxSizing: "border-box" });
const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const phoneRect: Rect = L(0, 0, PH.w, PH.h);

const TALL = 62; // top of the tall sheet (local y)
const SHORT = 330; // top of a short sheet
const sheetRect = (top: number): Rect => L(0, top, PH.w, PH.h - top);
const handleRect = (top: number): Rect => L(PH.w / 2 - 30, top + 6, 60, 22);
const closeRect = (top: number): Rect => L(12, top + 30, 40, 40);
const outsideRect = L(40, 120, 220, 60);
const statusRect = L(0, 0, PH.w, 26);

const PRODUCTS = [
  ["سمّاعة لاسلكية", "1,200 ج.م", "#C9E8E1"],
  ["شاحن سريع", "350 ج.م", "#F4DCC2"],
  ["حافظة هاتف", "180 ج.م", "#DCD8F4"],
  ["ساعة ذكية", "2,400 ج.م", "#F6D6D6"],
];

type SheetKind = "options" | "flow" | "share" | "details" | "review" | "product" | "calendar";
type St = { sheet: number; kind: SheetKind; top: number; close?: number; drawer?: number; step?: number; strike?: number };

const Row: React.FC<{ t: string; sub?: string; dot?: string }> = ({ t, sub, dot }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, height: 52, borderTop: `1px solid ${C.border}` }}>
    {dot ? <span style={{ width: 30, height: 30, borderRadius: 9, background: dot, flexShrink: 0 }} /> : null}
    <span style={{ fontSize: 16, fontWeight: 600, color: C.text, flex: 1 }}>{t}</span>
    {sub ? <span style={{ fontSize: 14, color: C.textMuted }}>{sub}</span> : null}
  </div>
);

const SheetBody: React.FC<{ kind: SheetKind; step: number }> = ({ kind, step }) => {
  if (kind === "options")
    return (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 8 }}>ترتيب وفلترة</div>
        {["الأحدث", "الأقل سعرًا", "الأعلى تقييمًا", "متوفر الآن", "شحن مجاني", "خصومات", "ماركات", "الألوان"].map((t) => (
          <Row key={t} t={t} sub="›" />
        ))}
      </>
    );
  if (kind === "flow") {
    const steps = ["العنوان", "الدفع", "المراجعة"];
    return (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>إتمام الطلب</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {steps.map((t, i) => (
            <div key={t} style={{ flex: 1, height: 30, borderRadius: 999, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: i <= step ? D.brand : C.surfaceAlt, color: i <= step ? D.onBrand : C.textMuted }}>
              {i < step ? "✓ " : ""}
              {t}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 14, color: C.textMuted, marginTop: 14 }}>خطوة {step + 1} من 3</div>
        {(step === 0 ? ["المدينة", "الشارع", "رقم المبنى"] : ["رقم البطاقة", "تاريخ الانتهاء", "CVV"]).map((t) => (
          <div key={t} style={{ marginTop: 10, height: 44, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: C.textMuted, boxSizing: "border-box" }}>{t}</div>
        ))}
        <div style={{ marginTop: 14, height: 46, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>التالي</div>
      </>
    );
  }
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
        <div style={{ marginTop: 10, height: 40, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>نشر</div>
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
        <div style={{ marginTop: 14, height: 46, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>اشترِ الآن</div>
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
      <div style={{ marginTop: 14, height: 44, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>التالي: بيانات الحجز</div>
    </>
  );
};

const Phone: React.FC<{ st: St }> = ({ st }) => {
  const r = sheetRect(st.top);
  const off = (1 - st.sheet) * (PH.h - st.top + 20);
  const dr = st.drawer ?? 0;
  return (
    <div dir="rtl" style={{ position: "absolute", left: PH.x, top: PH.y, width: PH.w, height: PH.h, borderRadius: 30, background: "#FFFFFF", border: `2px solid ${C.border}`, boxShadow: T.shadow.viewport, overflow: "hidden", fontFamily: FONT, boxSizing: "border-box" }}>
      <div style={{ ...loc(statusRect), background: D.brand, color: D.onBrand, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px" }}>
        <span dir="ltr">9:41</span>
        <span dir="ltr">▮▮▮ ◔</span>
      </div>
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
      {st.sheet > 0 ? <div style={{ position: "absolute", inset: 0, background: "rgba(16,18,24,0.45)", opacity: st.sheet }} /> : null}
      {st.sheet > 0 ? (
        <div style={{ ...loc(r), translate: `0px ${off}px`, background: "#FFFFFF", borderRadius: "22px 22px 0 0", boxShadow: "0 -10px 30px rgba(0,0,0,0.18)", padding: "36px 18px 18px", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 12, left: PH.w / 2 - 22, width: 44, height: 5, borderRadius: 3, background: C.border }} />
          {(st.close ?? 0) > 0 ? (
            <div style={{ position: "absolute", top: 30, left: 12, width: 40, height: 40, borderRadius: 20, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", opacity: st.close, scale: String(0.6 + 0.4 * (st.close ?? 0)) }}>
              <IconClose color={C.text} size={22} stroke={2.6} />
            </div>
          ) : null}
          <SheetBody kind={st.kind} step={st.step ?? 0} />
        </div>
      ) : null}
      {(st.strike ?? 0) > 0 ? (
        <svg style={{ ...loc(r), overflow: "visible" }} viewBox={`0 0 ${r.w} ${r.h}`}>
          <path d={`M24 24 L${r.w - 24} ${r.h - 24} M${r.w - 24} 24 L24 ${r.h - 24}`} stroke={C.warning} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (st.strike ?? 0)} fill="none" />
        </svg>
      ) : null}
      {dr > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300, translate: `0px ${(dr - 1) * 300}px`, background: "#1E2129", color: "#FFFFFF", padding: "18px 16px", boxSizing: "border-box", borderRadius: "0 0 22px 22px" }}>
          <div dir="ltr" style={{ fontSize: 34, fontWeight: 700 }}>9:41</div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} style={{ width: 44, height: 44, borderRadius: 22, background: i < 2 ? "#4C8DF6" : "#3A3F4B" }} />
            ))}
          </div>
          <div style={{ marginTop: 16, borderRadius: 14, background: "#2C303A", padding: "12px 14px", fontSize: 15, lineHeight: 1.5 }}>
            <b>رسالة جديدة</b>
            <div style={{ color: "#B8BDC8" }}>هل وصلك الطلب؟</div>
          </div>
          <div style={{ position: "absolute", bottom: 10, left: PH.w / 2 - 22, width: 44, height: 5, borderRadius: 3, background: "#6B7280" }} />
        </div>
      ) : null}
    </div>
  );
};

/** One short observation on the free (left) side of the content area. */
const SideNote: React.FC<{ y: number; text: string; p: number; icon?: React.ReactNode; big?: boolean; warn?: boolean }> = ({ y, text, p, icon, big, warn }) => {
  if (p <= 0) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: 34, width: 420, top: y, opacity: p, translate: `${(1 - p) * -16}px 0px`, background: warn ? C.warning : C.note, color: C.noteText, borderRadius: T.radius.md, boxShadow: T.shadow.note, padding: big ? "22px 26px" : "18px 24px", fontFamily: FONT, display: "flex", alignItems: "center", gap: 14, boxSizing: "border-box" }}>
      {icon ? <span style={{ width: 48, height: 48, borderRadius: 14, background: warn ? "rgba(255,255,255,0.22)" : C.select, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span> : null}
      <span style={{ fontSize: big ? 34 : 29, fontWeight: 600, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
};

/** Left-side card of short interactions the sheet is made for. */
const UseCard: React.FC<{ p: number; items: number[] }> = ({ p, items }) => {
  if (p <= 0) return null;
  const list = ["عرض تفاصيل", "تنفيذ Action", "كتابة منشور قصير"];
  return (
    <div dir="rtl" style={{ position: "absolute", left: 34, width: 440, top: 272, opacity: p, translate: `${(1 - p) * -16}px 0px`, fontFamily: FONT, background: "#FFFFFF", border: `2px solid ${C.border}`, borderRadius: 22, boxShadow: T.shadow.viewport, padding: "18px 26px", boxSizing: "border-box" }}>
      {list.map((t, i) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, height: 66, borderTop: i ? `1px solid ${C.border}` : undefined, opacity: items[i], translate: `${(1 - items[i]) * -20}px 0px` }}>
          <span style={{ width: 40, height: 40, borderRadius: 20, background: C.selectSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconCheck color={C.select} size={24} stroke={2.6} />
          </span>
          <span style={{ fontSize: 29, fontWeight: 600, color: C.text }}>{t}</span>
        </div>
      ))}
    </div>
  );
};

export const C02: React.FC = () => {
  const frame = useCurrentFrame();
  const at = (sec: number) => s(sec);

  // beats (seconds, from the clip's caption timing)
  const tOpen = at(1.2), tInspect = at(5.0), tTall = at(8.0), tDrag = at(13.6), tDrawer = at(16.2), tDrawerNote = at(17.0), tDrawerUp = at(23.0), tLost = at(24.6);
  const tNeed = at(30.0), tX = at(36.0), tXNote = at(37.0), tXTap = at(42.6), tEasy = at(43.6);
  const tFlow = at(46.0), tFlowNote = at(47.0), tStep2 = at(50.0), tOut = at(55.6), tNav = at(60.0), tGone = at(64.6);
  const tShort = at(70.0), tU1 = at(71.0), tU2 = at(73.6), tU3 = at(76.2);
  const tProduct = at(79.0), tProdNote = at(80.0), tCal = at(85.0), tStrike1 = at(83.2), tStrike2 = at(89.8), tEnd = at(91.0);

  // ---- product state ------------------------------------------------------------------------
  const pick = (): { kind: SheetKind; top: number; sheet: number } => {
    if (frame < tFlow) return { kind: "options", top: TALL, sheet: enter(frame, tOpen, 14) * exit(frame, tXTap + 4, 12) };
    if (frame < tShort) return { kind: "flow", top: TALL + 40, sheet: enter(frame, tFlow, 14) * exit(frame, tOut + 2, 12) };
    if (frame < tProduct) {
      const kinds: SheetKind[] = ["details", "share", "review"];
      const i = frame < tU2 ? 0 : frame < tU3 ? 1 : 2;
      const a = [tU1 - 10, tU2, tU3][i];
      const b = [tU2, tU3, tProduct][i];
      return { kind: kinds[i], top: SHORT - (i === 2 ? 20 : 0), sheet: enter(frame, a, 12) * exit(frame, b - 10, 10) };
    }
    if (frame < tCal) return { kind: "product", top: TALL + 50, sheet: enter(frame, tProduct, 14) * exit(frame, tCal - 10, 10) };
    return { kind: "calendar", top: TALL + 50, sheet: enter(frame, tCal, 14) };
  };
  const pk = pick();
  const st: St = {
    ...pk,
    close: frame < tFlow ? enter(frame, tX, 12) : 0,
    drawer: enter(frame, tDrawer - 8, 16) * exit(frame, tDrawerUp, 14),
    step: frame >= tStep2 ? 1 : 0,
    strike: frame >= tCal ? Math.min(1, Math.max(0, (frame - tStrike2) / 12)) : frame >= tProduct ? Math.min(1, Math.max(0, (frame - tStrike1) / 12)) : 0,
  };

  // ---- camera -----------------------------------------------------------------------------
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const top = (f: number) => ({ f, s: 1.18, fx: PH.x + PH.w / 2, fy: PH.y, cx: 770, cy: 12 });
  const shots: Shot[] = [{ f: 0, ...overview }, top(tDrag - 20), { f: tNeed, ...overview }, top(tX - 4), { f: tEasy, ...overview }];
  const cam = cameraAt(frame, shots);

  const mode: DebugMode = (frame >= tX && frame < tFlow) || (frame >= tShort && frame < tProduct) ? "compare" : frame < tInspect ? "live" : "inspect";

  // ---- focus dim --------------------------------------------------------------------------
  const dim = Math.max(span(frame, tInspect, tNeed), span(frame, tFlowNote, tShort - 6), span(frame, tProdNote, tEnd)) * 0.9;

  // ---- pointers ---------------------------------------------------------------------------
  const handle = camPoint(mid(handleRect(TALL)), cameraAt(tDrag, shots));
  const status = camPoint(mid(statusRect), cameraAt(tDrawer, shots));
  const xBtn = camPoint(mid(closeRect(TALL)), cameraAt(tXTap, shots));
  const out = camPoint(mid(outsideRect), cameraAt(tOut, shots));
  const tap = (f: number, p: { x: number; y: number }, dx: number, dy: number) => ({ keys: [{ f: f - 22, x: p.x + dx, y: p.y + dy }, { f, ...p, click: true }, { f: f + 26, ...p }] as Key[], from: f - 24, to: f + 36 });
  const touches = [
    // drag the handle down: the finger slips onto the status bar and pulls the notification drawer instead
    { keys: [{ f: tDrag - 20, x: handle.x - 40, y: handle.y + 140 }, { f: tDrag, ...handle, click: true }, { f: tDrag + 14, x: status.x + 10, y: status.y }, { f: tDrawer + 6, x: status.x + 20, y: status.y + 240 }, { f: tDrawer + 40, x: status.x + 20, y: status.y + 240 }] as Key[], from: tDrag - 22, to: tDrawer + 48 },
    tap(tXTap, xBtn, 60, 140),
    tap(tOut, out, -40, 120),
  ];

  const sel = (a: number, b: number) => enter(frame, a, 10) * exit(frame, b, 8);
  const wi = (I: React.FC<{ color: string; size?: number; stroke?: number }>) => <I color="#FFFFFF" size={30} stroke={2.4} />;
  const outTag = camPoint({ x: outsideRect.x, y: outsideRect.y + 90 }, cameraAt(tOut, shots));

  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      <Selection r={camRect(sheetRect(TALL), cam)} hover={sel(tInspect, tDrag - 20)} selected={sel(tInspect, tDrag - 20)} label="Bottom sheet" />
      <SideNote y={120} text="Bottom sheet طويلة تصل تقريبًا لأعلى الشاشة" p={span(frame, tTall, tDrawerNote)} />
      <SideNote y={120} text="السحب لأسفل فتح لوحة الإشعارات" p={span(frame, tDrawerNote, tNeed)} warn icon={wi(IconAlert)} />
      <SideNote y={280} text="ولم تُغلق الـ Sheet: المستخدم يتشتّت" p={span(frame, tLost, tNeed)} warn />

      <SideNote y={120} text="يحتاج طريقة أخرى للإغلاق غير السحب" p={span(frame, tNeed, tEasy)} />
      <Selection r={camRect(closeRect(TALL), cam)} hover={sel(tXNote, tXTap)} selected={sel(tXNote, tXTap)} label="Close button" />
      <SideNote y={280} text="أضف زر ✕ واضحًا" p={span(frame, tXNote, tEasy)} big icon={wi(IconClose)} />
      <SideNote y={200} text="تُغلق بسهولة، دون سحب" p={span(frame, tEasy, tFlow)} big icon={wi(IconCheck)} />

      <Selection r={camRect(sheetRect(TALL + 40), cam)} hover={sel(tFlowNote, tOut)} selected={sel(tFlowNote, tOut)} label="Bottom sheet" />
      <SideNote y={120} text="خطأ شائع: Flow كامل داخل Bottom sheet" p={span(frame, tFlowNote, tShort)} warn icon={wi(IconAlert)} />
      <Tag r={{ x: 0, y: outTag.y, w: 0, h: 0 }} x={outTag.x} text="أُغلقت بالخطأ" tone="warn" progress={span(frame, tOut + 10, tNav + 20)} />
      <SideNote y={280} text="التنقل بين الخطوات صعب" p={span(frame, tNav, tGone)} />
      <SideNote y={280} text="وكل الخطوات قد تضيع بخطأ واحد" p={span(frame, tGone, tShort)} warn />

      <SideNote y={120} text="Bottom sheet للتفاعلات القصيرة" p={span(frame, tShort, tProduct)} big icon={wi(IconClock)} />
      <UseCard p={span(frame, tU1 - 6, tProduct)} items={[enter(frame, tU1), enter(frame, tU2), enter(frame, tU3)]} />

      <SideNote y={120} text="ليست لـ Flow: منتج ثم Checkout" p={span(frame, tProdNote, tEnd)} warn />
      <SideNote y={270} text="ولا لتقويم وحجز موعد بخطوات" p={span(frame, tCal + 10, tEnd)} warn />
      <SideNote y={200} text="Bottom sheet للمهام القصيرة فقط" p={enter(frame, tEnd)} big icon={wi(IconCheck)} />

      {touches.map((t, i) => (
        <UserTouch key={i} frame={frame} keys={t.keys} from={t.from} to={t.to} />
      ))}
    </>
  );

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <DebuggerShell mode={mode} address="shop.app" illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <Phone st={st} />
        </div>
      </DebuggerShell>

      {/* presenter: Eyad's own camera from the original recording */}
      <div style={{ position: "absolute", left: 40, top: 24, width: 236, height: 160, borderRadius: 20, overflow: "hidden", boxShadow: T.shadow.viewport, border: `2px solid ${C.border}`, background: "#000" }}>
        <OffthreadVideo src={staticFile("c02/cam.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div dir="rtl" style={{ position: "absolute", right: 8, bottom: 8, height: 30, padding: "0 12px", borderRadius: 999, background: "rgba(23,26,33,0.78)", color: "#FFFFFF", fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center" }}>إياد محمود</div>
      </div>
      <div dir="rtl" style={{ position: "absolute", left: 300, right: 40, top: 40, textAlign: "right" }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.text }}>متى تناسبك الـ Bottom sheet؟</div>
        <div dir="ltr" style={{ fontSize: 26, fontWeight: 600, color: C.textMuted, marginTop: 10, textAlign: "right" }}>Bottom sheet · Close button</div>
      </div>
      <Audio src={staticFile("c02/voice.m4a")} />
    </AbsoluteFill>
  );
};
