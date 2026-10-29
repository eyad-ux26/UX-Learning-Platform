import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection, Tag } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconAlert, IconBag, IconChat, IconCheck, IconClose, IconEye, IconLock, IconTarget } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";
import { Btn, Card, CaseChip, clipFrames, Field, Header, IntroCard, L, ListCard, loc, mid, PH, PhoneFrame, phoneRect, Presenter, RecapCard, Scrim, SideNote, Strike, TitleBand, v, Voice, wi } from "./p14";

/*
 * P14-C01 re-edit: WP 17 "when to use a modal dialog, and when not" (177.3–412.0 s). An illustrative shop app acts out
 * each case; Eyad's voice and camera are kept. Beat times are the clip's caption timings (seconds of voice).
 */
const VOICE = 234.65;
export const C01_FRAMES = clipFrames(VOICE);

// ---- geometry --------------------------------------------------------------------------------------------
const ASK_H = 128;
const rowRect = (i: number, ask = 0): Rect => L(14, 74 + ASK_H * ask + 96 * i, PH.w - 28, 84);
const askRect = L(14, 72, PH.w - 28, ASK_H - 12);
const askYes = L(PH.w - 14 - 14 - 106, 72 + 66, 106, 38);
const dlg = L(20, 150, PH.w - 40, 250);
const dlgBtnA = L(20 + 18, 150 + 190, 116, 42); // left button (end side in RTL)
const warnRect = L(20, 160, PH.w - 40, 240);
const keepBtn = L(PH.w - 20 - 18 - 104, 160 + 178, 104, 42);
const cancelOrderBtn = L(14, 300, PH.w - 28, 50);
const checkoutBtn = L(14, PH.h - 80, PH.w - 28, 54);
const loginRect = L(20, 120, PH.w - 40, 300);
const loginBtn = L(38, 120 + 230, PH.w - 76, 46);
const stepsRect = L(20, 140, PH.w - 40, 270);
const saveRect = L(20, 140, PH.w - 40, 280);
const saveClose = L(20 + 12, 140 + 12, 34, 34);
const saveLater = L(20 + 18, 140 + 220, 110, 42);
const rateRect = L(20, 170, PH.w - 40, 200);
const promoRect = L(20, 120, PH.w - 40, 290);
const cartRow = (i: number): Rect => L(14, 74 + 104 * i, PH.w - 28, 92);
const priceRect = (i: number): Rect => L(118, 74 + 104 * i + 48, 92, 30);
const couponRect = L(20, 140, PH.w - 40, 250);
const panelRect = L(0, 334, PH.w, 248);
const panelPick = L(PH.w - 14 - 132, 334 + 92, 132, 54);

const PRODUCTS: [string, string, string][] = [
  ["سمّاعة لاسلكية", "1,200 ج.م", "#C9E8E1"],
  ["شاحن سريع", "350 ج.م", "#F4DCC2"],
  ["حافظة هاتف", "180 ج.م", "#DCD8F4"],
];
const CARD = "4321 8765 0000 1234";
const typed = (frame: number, a: number, b: number, text: string) => text.slice(0, Math.round(Math.min(1, Math.max(0, (frame - a) / (b - a))) * text.length));

const ProductRows: React.FC<{ ask?: number; press?: number }> = ({ ask = 0, press = 0 }) => (
  <>
    {PRODUCTS.map(([t, p, c], i) => (
      <div key={t} style={{ ...loc(rowRect(i, ask)), borderRadius: 14, background: i === 2 && press > 0 ? `rgba(14,124,107,${0.14 * press})` : C.surfaceAlt, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 12, background: c, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{t}</div>
          <div style={{ fontSize: 16, color: D.brand, fontWeight: 700, marginTop: 4 }}>{p}</div>
        </div>
      </div>
    ))}
  </>
);

const DlgTitle: React.FC<{ t: string; sub?: string }> = ({ t, sub }) => (
  <>
    <div style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>{t}</div>
    {sub ? <div style={{ fontSize: 15, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{sub}</div> : null}
  </>
);

export const C01: React.FC = () => {
  const f = useCurrentFrame();

  // ---- beats (voice seconds) --------------------------------------------------------------------
  const B = {
    introPop: v(1.0), introNote: v(1.8), introAnnoy: v(5.3), introWhen: v(9.0),
    c1: v(12.42), c1Tap: v(15.0), c1Dlg: v(16.2), c1Note: v(17.2), c1Err: v(28.9), c1Fit: v(32.02), c1Back: v(40.6),
    c2: v(43.74), c2Note: v(45.72), c2Tap: v(61.0), c2Dlg: v(66.2), c2Ctx: v(72.66), c2Type: v(82.0), c2Login: v(90.4), c2Back: v(93.68), c2Best: v(105.62),
    c3: v(109.96), c3Step2: v(114.6), c3Step3: v(118.2),
    c4: v(121.12), c4Note: v(122.0), c4Close: v(133.06), c4Better: v(143.36), c4Later: v(147.0),
    n1: v(148.58), n1Note: v(149.2), n1Minor: v(154.2), n1Fix: v(159.22), n1Ask: v(160.0), n1Yes: v(166.6), n1Open: v(167.4), n1Save: v(172.4),
    n1Rules: v(173.34), n1R1: v(174.2), n1R2: v(176.6), n1R3: v(178.4),
    n2: v(183.36), n2Behind: v(187.0), n2Focus: v(189.2), n2Co: v(193.46), n2Promo: v(200.0), n2Cut: v(201.3), n2Calm: v(203.84), n2Annoy: v(210.88), n2Strike: v(213.0), n2No: v(214.26),
    n3: v(217.16), n3Coupon: v(217.6), n3Need: v(218.6), n3Hidden: v(221.0), n3NonModal: v(226.66), n3Note: v(227.4), n3Pick: v(231.0), end: v(233.0),
  };

  type Scene = "intro" | "orders" | "cart" | "checkoutOk" | "home" | "checkout" | "cart2";
  const scene: Scene =
    f < B.c1 ? "intro" : f < B.c2 ? "orders" : f < B.c2Back ? "cart" : f < B.c3 ? "checkoutOk" : f < B.n2Co ? "home" : f < B.n3 ? "checkout" : "cart2";
  const cuts = [B.c1, B.c2, B.c2Back, B.c3, B.n2Co, B.n3];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));

  // ---- camera ----------------------------------------------------------------------------------
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const push = (at: number, bottom = false): Shot => ({ f: at, s: 1.12, fx: PH.x + PH.w / 2, fy: bottom ? PH.y + PH.h : PH.y, cx: 770, cy: bottom ? CONTENT.h - 10 : 12 });
  const shots: Shot[] = [
    { f: 0, ...overview },
    push(B.c1Dlg), { f: B.c1Back, ...overview },
    push(B.c2Dlg), { f: B.c2Back, ...overview },
    push(B.c4Close - 20), { f: B.n1, ...overview },
    push(B.n2Promo + 4), { f: B.n2No + 20, ...overview },
    push(B.n3NonModal + 10, true), { f: B.end, ...overview },
  ];
  const cam = cameraAt(f, shots);

  const compare = (f >= B.n1Fix && f < B.n1Rules) || (f >= B.n2Strike && f < B.n3) || f >= B.n3NonModal;
  const mode: DebugMode = f < B.introNote ? "live" : compare ? "compare" : "inspect";
  const address = scene === "orders" ? "shop.app/orders" : scene === "cart" || scene === "cart2" ? "shop.app/cart" : scene === "checkout" || scene === "checkoutOk" ? "shop.app/checkout" : "shop.app";

  // ---- phone content ---------------------------------------------------------------------------
  const introDlg = enter(f, B.introPop, 10) * exit(f, B.c1 - 10, 8);
  const warn = enter(f, B.c1Dlg, 10) * exit(f, B.c1Back + 6, 8);
  const login = enter(f, B.c2Dlg, 10) * exit(f, B.c2Login + 6, 8);
  const steps = enter(f, B.c3, 10) * exit(f, B.c4 - 8, 8);
  const save = enter(f, B.c4, 10) * exit(f, B.c4Later + 6, 8);
  const bday = enter(f, B.n1, 10) * exit(f, B.n1Fix, 8) + enter(f, B.n1Open, 10) * exit(f, B.n1Save + 4, 8);
  const ask = enter(f, B.n1Ask, 14) * exit(f, B.n1R1, 14);
  const rate = enter(f, B.n2, 10) * exit(f, B.n2Co - 10, 8);
  const promo = enter(f, B.n2Promo, 10) * exit(f, B.n2Strike + 18, 10);
  const coupon = enter(f, B.n3Coupon, 10) * exit(f, B.n3NonModal, 8);
  const panel = enter(f, B.n3NonModal + 6, 16);
  const stepNo = f < B.c3Step2 ? 0 : f < B.c3Step3 ? 1 : 2;

  let phone: React.ReactNode;
  if (scene === "intro" || scene === "home") {
    phone = (
      <>
        <Header title="متجري" />
        {ask > 0 ? (
          <div style={{ ...loc(askRect), height: (ASK_H - 12) * ask, overflow: "hidden", borderRadius: 14, background: D.brandSoft, border: `2px solid ${D.brand}`, padding: "12px 14px" }}>
            {f >= B.n1Save + 6 ? (
              <div style={{ fontSize: 17, fontWeight: 700, color: D.brand, display: "flex", alignItems: "center", gap: 8, height: 80 }}>
                <IconCheck color={D.brand} size={24} stroke={2.6} /> تم الحفظ، شكرًا!
              </div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>أضف تاريخ ميلادك لتصلك هدية؟</div>
                <div style={{ position: "absolute", top: 66, left: 14, width: 92, height: 38, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: C.textMuted, boxSizing: "border-box" }}>لاحقًا</div>
                <div style={{ position: "absolute", top: 66, right: 14, width: 106, height: 38, borderRadius: 10, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>نعم</div>
              </>
            )}
          </div>
        ) : null}
        <ProductRows ask={ask} />
        <Scrim p={Math.max(introDlg, steps, save, bday, rate)} />
        <Card r={dlg} p={introDlg}>
          <DlgTitle t="عرض خاص لك!" sub="خصم 15% على السمّاعات هذا الأسبوع." />
          <div style={{ marginTop: 16, height: 70, borderRadius: 12, background: "#C9E8E1" }} />
        </Card>
        {introDlg > 0 ? <Btn r={{ ...dlgBtnA, w: PH.w - 76 }} text="تسوّق الآن" filled o={introDlg} /> : null}
        <Card r={stepsRect} p={steps}>
          <DlgTitle t="أضف بطاقة جديدة" />
          <div dir="rtl" style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {["البيانات", "التحقق", "تم"].map((t, i) => (
              <div key={t} style={{ flex: 1, height: 30, borderRadius: 999, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: i <= stepNo ? D.brand : C.surfaceAlt, color: i <= stepNo ? D.onBrand : C.textMuted }}>{i < stepNo ? "✓ " : ""}{t}</div>
            ))}
          </div>
          <div style={{ fontSize: 14, color: C.textMuted, marginTop: 12 }}>خطوة {stepNo + 1} من 3</div>
          {stepNo === 0 ? (
            <div style={{ marginTop: 10, height: 44, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: C.textMuted }}>رقم البطاقة</div>
          ) : stepNo === 1 ? (
            <div dir="ltr" style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center" }}>
              {[1, 2, 3, 4].map((i) => (
                <span key={i} style={{ width: 40, height: 44, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>{i <= 3 ? "•" : ""}</span>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, color: D.brand, display: "flex", alignItems: "center", gap: 8 }}>
              <IconCheck color={D.brand} size={24} stroke={2.6} /> أُضيفت البطاقة
            </div>
          )}
          <div style={{ marginTop: 16, height: 42, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>{stepNo < 2 ? "التالي" : "تم"}</div>
        </Card>
        <Card r={saveRect} p={save}>
          <div style={{ position: "absolute", top: 12, left: 12, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconClose color={C.textMuted} size={22} stroke={2.4} />
          </div>
          <DlgTitle t="احفظ عنوانك" sub="ليصبح طلبك القادم أسرع." />
          <div style={{ marginTop: 14, height: 46, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: C.textMuted }}>المدينة، الشارع، رقم المبنى</div>
        </Card>
        {save > 0 ? (
          <>
            <Btn r={saveLater} text="ليس الآن" o={save} />
            <Btn r={{ ...saveLater, x: saveLater.x + 118, w: 106 }} text="حفظ" filled o={save} />
          </>
        ) : null}
        <Card r={dlg} p={bday}>
          <DlgTitle t="أضف تاريخ ميلادك" sub="لنرسل لك هدية في يومك." />
          <div style={{ marginTop: 14, height: 48, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 16, color: C.textMuted }}>يوم / شهر / سنة</div>
        </Card>
        {bday > 0 ? (
          <>
            <Btn r={dlgBtnA} text="لاحقًا" o={bday} />
            <Btn r={{ ...dlgBtnA, x: dlgBtnA.x + 124, w: 106 }} text="حفظ" filled o={bday} />
          </>
        ) : null}
        <Card r={rateRect} p={rate}>
          <DlgTitle t="كيف كانت تجربتك؟" />
          <div dir="ltr" style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 8, fontSize: 36, color: "#F2B530" }}>☆☆☆☆☆</div>
          <div style={{ marginTop: 18, height: 42, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>إرسال</div>
        </Card>
      </>
    );
  } else if (scene === "orders") {
    phone = (
      <>
        <Header title="طلباتي" />
        <div style={{ position: "absolute", top: 74, left: 14, right: 14, borderRadius: 14, background: C.surfaceAlt, padding: 14 }}>
          <div style={{ fontSize: 15, color: C.textMuted }}>طلب رقم 4821 · قيد التجهيز</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
            <div style={{ width: 60, height: 60, borderRadius: 12, background: "#C9E8E1" }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>سمّاعة لاسلكية</div>
              <div style={{ fontSize: 16, color: D.brand, fontWeight: 700, marginTop: 4 }}>1,200 ج.م</div>
            </div>
          </div>
        </div>
        <div style={{ ...loc(cancelOrderBtn), borderRadius: 12, border: `2px solid ${C.warning}`, color: C.warning, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, background: span(f, B.c1Tap - 2, B.c1Tap + 10, 4) > 0 ? C.warningSoft : "transparent" }}>إلغاء الطلب</div>
        <Scrim p={warn} />
        <Card r={warnRect} p={warn}>
          <DlgTitle t="إلغاء الطلب؟" sub="سيُلغى الطلب ويُرَدّ المبلغ خلال 7 أيام. لا يمكن التراجع عن ذلك." />
        </Card>
        {warn > 0 ? (
          <>
            <Btn r={keepBtn} text="تراجع" o={warn} />
            <Btn r={{ ...keepBtn, x: keepBtn.x - 120, w: 112 }} text="إلغاء الطلب" filled color={C.warning} o={warn} />
          </>
        ) : null}
      </>
    );
  } else if (scene === "cart") {
    phone = (
      <>
        <Header title="السلة" />
        <ProductRows />
        <div style={{ ...loc(checkoutBtn), borderRadius: 14, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, opacity: 1 - span(f, B.c2Tap - 2, B.c2Tap + 8, 4) * 0.3 }}>إتمام الشراء · 1,730 ج.م</div>
        <Scrim p={login} />
        <Card r={loginRect} p={login}>
          <DlgTitle t="سجّل الدخول للمتابعة" sub="لنحفظ طلبك ونرسل لك تحديثاته." />
        </Card>
        {login > 0 ? (
          <div style={{ opacity: login }}>
            <Field r={L(38, 120 + 118, PH.w - 76, 44)} value={typed(f, B.c2Type, B.c2Type + 40, "mona@mail.com") || "البريد الإلكتروني"} caret={f >= B.c2Type && f < B.c2Type + 42} ltr={f >= B.c2Type} />
            <Field r={L(38, 120 + 172, PH.w - 76, 44)} value={f >= B.c2Type + 50 ? "••••••••".slice(0, Math.min(8, Math.round((f - B.c2Type - 50) / 3))) : "كلمة المرور"} caret={f >= B.c2Type + 50 && f < B.c2Login} ltr={f >= B.c2Type + 50} />
            <Btn r={loginBtn} text="تسجيل الدخول" filled />
          </div>
        ) : null}
      </>
    );
  } else if (scene === "checkoutOk") {
    phone = (
      <>
        <Header title="الدفع" />
        <div style={{ position: "absolute", top: 72, left: 14, right: 14, display: "flex", gap: 6 }}>
          {["الشحن", "الدفع", "المراجعة"].map((t, i) => (
            <div key={t} style={{ flex: 1, height: 32, borderRadius: 999, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: i === 0 ? D.brand : C.surfaceAlt, color: i === 0 ? D.onBrand : C.textMuted }}>{t}</div>
          ))}
        </div>
        <div style={{ position: "absolute", top: 122, left: 14, right: 14, fontSize: 15, fontWeight: 700, color: D.brand, display: "flex", alignItems: "center", gap: 6 }}>
          <IconCheck color={D.brand} size={20} stroke={2.6} /> مرحبًا منى، أكمل طلبك
        </div>
        <Field r={L(18, 190, PH.w - 36, 48)} label="عنوان الشحن" value="" />
        <Field r={L(18, 270, PH.w - 36, 48)} label="رقم الهاتف" value="" />
        <div style={{ position: "absolute", left: 18, right: 18, bottom: 26, height: 54, borderRadius: 14, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>التالي</div>
      </>
    );
  } else if (scene === "checkout") {
    const n = Math.round(Math.min(1, Math.max(0, (f - B.n2Co - 15) / (B.n2Promo - B.n2Co - 20))) * 0.55 * CARD.length + Math.min(1, Math.max(0, (f - B.n2No - 10) / 50)) * 0.45 * CARD.length);
    phone = (
      <>
        <Header title="الدفع" />
        <div style={{ position: "absolute", top: 72, left: 14, right: 14, display: "flex", gap: 6 }}>
          {["الشحن ✓", "الدفع", "المراجعة"].map((t, i) => (
            <div key={t} style={{ flex: 1, height: 32, borderRadius: 999, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: i === 1 ? D.brand : C.surfaceAlt, color: i === 1 ? D.onBrand : C.textMuted }}>{t}</div>
          ))}
        </div>
        <Field r={L(18, 160, PH.w - 36, 52)} label="رقم البطاقة" value={CARD.slice(0, n)} caret={n < CARD.length} ltr />
        <Field r={L(PH.w - 18 - 126, 258, 126, 48)} label="تاريخ الانتهاء" value="" />
        <Field r={L(18, 258, 126, 48)} label="CVV" value="" />
        <div style={{ position: "absolute", top: 330, left: 18, right: 18, fontSize: 16, color: C.text }}>
          {[["المنتجات", "1,730 ج.م"], ["الشحن", "50 ج.م"]].map(([a, b]) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between", height: 34, color: C.textMuted }}><span>{a}</span><span>{b}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", height: 40, borderTop: `1px solid ${C.border}`, paddingTop: 8, fontWeight: 700, fontSize: 18 }}><span>الإجمالي</span><span>1,780 ج.م</span></div>
        </div>
        <div style={{ position: "absolute", left: 18, right: 18, bottom: 26, height: 54, borderRadius: 14, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>ادفع 1,780 ج.م</div>
        <Scrim p={promo} />
        <Card r={promoRect} p={promo}>
          <div style={{ position: "absolute", top: 12, left: 14, fontSize: 20, color: C.textMuted }}>✕</div>
          <div style={{ height: 70, borderRadius: 12, background: "#FCE3EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: "#C2185B" }}>خصم 10%</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginTop: 14 }}>اشترك في رسائلنا البريدية!</div>
          <div style={{ marginTop: 12, height: 44, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: C.textMuted }}>بريدك الإلكتروني</div>
          <div style={{ marginTop: 12, height: 42, borderRadius: 12, background: "#C2185B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>اشترك الآن</div>
        </Card>
        {promo > 0 ? <Strike r={promoRect} p={(f - B.n2Strike) / 12} /> : null}
      </>
    );
  } else {
    phone = (
      <>
        <Header title="السلة" />
        {PRODUCTS.map(([t, p, col], i) => (
          <div key={t} style={{ ...loc(cartRow(i)), borderRadius: 14, background: C.surfaceAlt, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 62, height: 62, borderRadius: 12, background: col, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{t}</div>
              <div style={{ fontSize: 18, color: D.brand, fontWeight: 700, marginTop: 6 }}>{p}</div>
            </div>
          </div>
        ))}
        <Scrim p={coupon} />
        <Card r={couponRect} p={coupon}>
          <DlgTitle t="كوبون خصم 20% على منتج واحد" sub="على أي منتج تطبّقه؟" />
          {["سمّاعة", "شاحن", "حافظة"].map((t) => (
            <div key={t} style={{ marginTop: 8, height: 34, display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: C.text }}>
              <span style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${C.textMuted}` }} />
              {t}
            </div>
          ))}
        </Card>
        {panel > 0 ? (
          <div style={{ ...loc(panelRect), background: "#FFFFFF", borderTop: `3px solid ${D.brand}`, borderRadius: "20px 20px 0 0", boxShadow: "0 -10px 30px rgba(0,0,0,0.14)", padding: "16px 14px", translate: `0px ${(1 - panel) * panelRect.h}px` }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>كوبون خصم 20% على منتج واحد</div>
            <div style={{ fontSize: 15, color: C.textMuted, marginTop: 4 }}>اختر المنتج من السلة:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {["سمّاعة", "شاحن", "حافظة"].map((t, i) => {
                const on = i === 0 && f >= B.n3Pick;
                return (
                  <div key={t} style={{ width: 132, height: 54, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 17, fontWeight: 700, boxSizing: "border-box", border: `2px solid ${on ? D.brand : C.border}`, background: on ? D.brandSoft : "#FFFFFF", color: on ? D.brand : C.text }}>
                    {on ? <IconCheck color={D.brand} size={20} stroke={2.6} /> : null}
                    {t}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  // ---- overlays ----------------------------------------------------------------------------------
  const dim = Math.max(span(f, B.introNote, B.c1 - 6), span(f, B.c1Note, B.c1Back), span(f, B.c2Ctx, B.c2Login), span(f, B.c4Close, B.c4Later), span(f, B.n1Note, B.n1Fix), span(f, B.n2, B.n2Co - 8), span(f, B.n2Cut, B.n2Strike + 24), span(f, B.n3Hidden, B.n3NonModal)) * 0.9;
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const tap = (at: number, r: Rect, dx: number, dy: number) => {
    const p = camPoint(mid(r), cameraAt(at, shots));
    return { keys: [{ f: at - 22, x: p.x + dx, y: p.y + dy }, { f: at, ...p, click: true }, { f: at + 26, ...p }] as Key[], from: at - 24, to: at + 36 };
  };
  const touches = [
    tap(B.c1Tap, cancelOrderBtn, -50, 130), tap(B.c1Back, keepBtn, -40, 140), tap(B.c2Tap, checkoutBtn, -40, -120), tap(B.c2Login, loginBtn, -40, 120),
    tap(B.c4Later, saveLater, 50, 130), tap(B.n1Yes, askYes, -60, 140), tap(B.n1Save, { ...dlgBtnA, x: dlgBtnA.x + 124, w: 106 }, -40, 150), tap(B.n2Behind, rowRect(2), -70, 110), tap(B.n3Pick, panelPick, 40, 120),
  ];
  const behind = camPoint({ x: rowRect(2).x, y: rowRect(2).y + rowRect(2).h + 30 }, cameraAt(B.n2Behind, shots));

  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      {/* intro: what a modal dialog does */}
      <Selection r={camRect(dlg, cam)} hover={sel(B.introNote, B.c1 - 10)} selected={sel(B.introNote, B.c1 - 10)} label="Modal dialog" />
      <SideNote y={110} text="يعزل المستخدم عن محتوى الصفحة" p={span(f, B.introNote, B.c1)} icon={wi(IconLock)} />
      <SideNote y={250} text="لذلك قد يكون مزعجًا" p={span(f, B.introAnnoy, B.c1)} warn />
      <SideNote y={380} text="فمتى يكون مناسبًا؟" p={span(f, B.introWhen, B.c1)} big />

      {/* when to use */}
      <CaseChip y={40} text="متى تستخدمه · 1" p={span(f, B.c1, B.c2)} />
      <SideNote y={110} text="تحذير مهم قبل خطأ لا رجعة فيه" p={span(f, B.c1Note, B.c2)} icon={wi(IconAlert)} />
      <Selection r={camRect(warnRect, cam)} hover={sel(B.c1Note, B.c1Back)} selected={sel(B.c1Note, B.c1Back)} label="Modal dialog" />
      <SideNote y={260} text="يركّز على التحذير الآن" p={span(f, B.c1Fit, B.c2)} icon={wi(IconTarget)} />
      <Tag r={camRect({ x: warnRect.x, y: warnRect.y - 34, w: 0, h: 0 }, cam)} text="يمنع خطأ" progress={span(f, B.c1Err, B.c1Back)} icon={IconCheck} />

      <CaseChip y={40} text="متى تستخدمه · 2" p={span(f, B.c2, B.c3)} />
      <SideNote y={110} text="معلومة تحتاجها المهمة لتكتمل" p={span(f, B.c2Note, B.c2Back)} icon={wi(IconBag)} />
      <Selection r={camRect(loginRect, cam)} hover={sel(B.c2Dlg + 8, B.c2Login)} selected={sel(B.c2Dlg + 8, B.c2Login)} label="Modal dialog" />
      <SideNote y={260} text="لم يخرج من سياق الشراء" p={span(f, B.c2Ctx, B.c2Back)} />
      <SideNote y={110} text="يكمل الخطوة، ثم يعود لما كان يفعله" p={span(f, B.c2Back, B.c3)} icon={wi(IconCheck)} />
      <SideNote y={260} text="أهم ميزة للـ Modal dialog" p={span(f, B.c2Best, B.c3)} big />

      <CaseChip y={40} text="متى تستخدمه · 3" p={span(f, B.c3, B.c4)} />
      <SideNote y={110} text="Process من عدة خطوات داخل نفس الـ Dialog" p={span(f, B.c3 + 6, B.c4)} />
      <Selection r={camRect(stepsRect, cam)} hover={sel(B.c3 + 10, B.c4 - 6)} selected={sel(B.c3 + 10, B.c4 - 6)} label="Modal dialog" />

      <CaseChip y={40} text="متى تستخدمه · 4" p={span(f, B.c4, B.n1)} />
      <SideNote y={110} text="بيانات توفّر على المستخدم جهدًا لاحقًا" p={span(f, B.c4Note, B.n1)} />
      <Selection r={camRect(saveClose, cam)} hover={sel(B.c4Close, B.c4Later)} selected={sel(B.c4Close, B.c4Later)} />
      <Selection r={camRect(saveLater, cam)} hover={sel(B.c4Close + 6, B.c4Later)} selected={sel(B.c4Close + 6, B.c4Later)} />
      <SideNote y={260} text="مع خيار إغلاقه بسهولة" p={span(f, B.c4Close, B.n1)} icon={wi(IconClose)} />
      <SideNote y={390} text="وتساعدك على تحسين تجربته" p={span(f, B.c4Better, B.n1)} />

      {/* when not to use */}
      <CaseChip y={40} text="متى لا تستخدمه · 1" p={span(f, B.n1, B.n2)} warn />
      <Selection r={camRect(dlg, cam)} hover={sel(B.n1Note, B.n1Fix)} selected={sel(B.n1Note, B.n1Fix)} label="Modal dialog" />
      <SideNote y={110} text="معلومة يمكن طلبها لاحقًا" p={span(f, B.n1Note, B.n1Fix)} warn icon={wi(IconLock)} />
      <SideNote y={240} text="وليست مهمة الآن" p={span(f, B.n1Minor, B.n1Fix)} warn />
      <Selection r={camRect(askRect, cam)} hover={sel(B.n1Ask + 10, B.n1Open)} selected={sel(B.n1Ask + 10, B.n1Open)} label="رسالة داخل الصفحة" />
      <SideNote y={110} text="اسأله أولًا داخل الصفحة" p={span(f, B.n1Ask, B.n1Rules)} icon={wi(IconChat)} />
      <SideNote y={240} text="وافق؟ الآن افتح Dialog أو صفحة" p={span(f, B.n1Open, B.n1Rules)} icon={wi(IconCheck)} />
      <ListCard title="لا تستخدم Modal dialog إذا كانت المعلومة:" p={span(f, B.n1Rules + 4, B.n2)} items={[{ text: "يمكن طلبها لاحقًا", p: enter(f, B.n1R1), no: true }, { text: "غير مهمة", p: enter(f, B.n1R2), no: true }, { text: "لا تساعد في الـ Flow الحالي", p: enter(f, B.n1R3), no: true }]} />

      <CaseChip y={40} text="متى لا تستخدمه · 2" p={span(f, B.n2, B.n3)} warn />
      <Selection r={camRect(rateRect, cam)} hover={sel(B.n2, B.n2Co - 8)} selected={sel(B.n2, B.n2Co - 8)} label="Modal dialog" />
      <SideNote y={110} text="يعزل المستخدم عن المحتوى" p={span(f, B.n2 + 6, B.n2Co)} icon={wi(IconLock)} />
      <Tag r={{ x: 0, y: behind.y, w: 0, h: 0 }} x={behind.x - 40} text="لا شيء يحدث" tone="warn" progress={span(f, B.n2Behind + 4, B.n2Co - 8)} />
      <SideNote y={250} text="ويجعله يركّز في الـ Dialog فقط" p={span(f, B.n2Focus, B.n2Co)} icon={wi(IconTarget)} />
      <SideNote y={110} text="المستخدم الآن في Checkout" p={span(f, B.n2Co + 6, B.n2Calm)} icon={wi(IconBag)} />
      <Tag r={camRect({ x: promoRect.x, y: promoRect.y - 40, w: 0, h: 0 }, cam)} text="يقطع خطوة حساسة" tone="warn" progress={span(f, B.n2Cut, B.n2Strike)} />
      <SideNote y={250} text="قلق · دقة · تركيز" p={span(f, B.n2Calm, B.n2Annoy)} big />
      <SideNote y={250} text="Modal dialog هنا مزعج جدًا" p={span(f, B.n2Annoy, B.n2No)} warn big />
      <SideNote y={250} text="لا Modal dialog أثناء الـ Checkout" p={span(f, B.n2No, B.n3)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="متى لا تستخدمه · 3" p={span(f, B.n3, VOICE_END)} warn />
      <SideNote y={110} text="القرار يحتاج بيانات خارج الـ Dialog" p={span(f, B.n3Need, B.n3NonModal)} icon={wi(IconEye)} />
      <Tag r={camRect({ x: couponRect.x, y: couponRect.y + couponRect.h + 36, w: 0, h: 0 }, cam)} text="الأسعار مخفية خلفه" tone="warn" progress={span(f, B.n3Hidden, B.n3NonModal)} />
      <Selection r={camRect(panelRect, cam)} hover={sel(B.n3NonModal + 20, VOICE_END)} selected={sel(B.n3NonModal + 20, VOICE_END)} label="Non-modal dialog" />
      {[0, 1, 2].map((i) => (
        <Selection key={i} r={camRect(priceRect(i), cam)} hover={sel(B.n3Note + 10 + i * 4, VOICE_END)} selected={0} />
      ))}
      <SideNote y={110} text="استخدم Non-modal dialog أو صفحة" p={span(f, B.n3Note, VOICE_END)} big icon={wi(IconCheck)} />
      <SideNote y={280} text="الأسعار ظاهرة أثناء القرار" p={span(f, B.n3Note + 30, VOICE_END)} />

      {touches.map((t, i) => (
        <UserTouch key={i} frame={f} keys={t.keys} from={t.from} to={t.to} />
      ))}
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={address} illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>{phone}</PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c01/cam.mp4" />
      <TitleBand title="متى تستخدم الـ Modal dialog؟" sub="Modal · Non-modal" />
      <Voice src="c01/voice.m4a" />
      <IntroCard title="متى تستخدم الـ Modal dialog، ومتى لا؟" sub="Modal dialog" points={["4 حالات مناسبة", "3 حالات تتجنّبه فيها"]} />
      <RecapCard
        voiceSec={VOICE}
        title="الـ Modal dialog يوقف كل شيء، فاستخدمه حين يستحق"
        items={[
          { text: "تحذير مهم قبل خطأ" },
          { text: "معلومة تحتاجها المهمة الآن، مثل تسجيل الدخول" },
          { text: "معلومة غير مهمة أو يمكن طلبها لاحقًا", no: true },
          { text: "أثناء Checkout أو أي خطوة حساسة", no: true },
          { text: "قرار يحتاج بيانات يخفيها الـ Dialog", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
const VOICE_END = v(VOICE) + 6;
