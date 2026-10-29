import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C, CONTENT, D, FONT, T } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection, Tag } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconBag, IconChat, IconCheck, IconEye, IconLock, IconTarget } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";

/*
 * P14-C01 re-edit: WP 17 "when not to use a modal dialog" (328–411 s). The slides are replaced by an illustrative shop
 * app in one phone; Eyad's voice and camera are kept. Beat times are the clip's caption timings (seconds).
 */
const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
export const C01_FRAMES = s(83.4);

// ---- product geometry (content coordinates; the phone's own layout is in local pixels) ------------
const PH = { x: 640, y: 22, w: 300, h: 582 };
const L = (x: number, y: number, w: number, h: number): Rect => ({ x: PH.x + x, y: PH.y + y, w, h });
const loc = (r: Rect): React.CSSProperties => ({ position: "absolute", left: r.x - PH.x, top: r.y - PH.y, width: r.w, height: r.h, boxSizing: "border-box" });
const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const phoneRect: Rect = L(0, 0, PH.w, PH.h);

const ASK_H = 128;
const rowRect = (i: number, ask: number): Rect => L(14, 74 + ASK_H * ask + 96 * i, PH.w - 28, 84);
const askRect = L(14, 72, PH.w - 28, ASK_H - 12);
const askYes = L(14 + 150, 72 + 66, 106, 38);
const dialogRect = L(20, 150, PH.w - 40, 250);
const saveBtn = L(20 + 18, 150 + 190, 116, 42);
const rateRect = L(20, 170, PH.w - 40, 200);
const cardField = L(18, 160, PH.w - 36, 52);
const promoRect = L(20, 120, PH.w - 40, 290);
const cartRow = (i: number): Rect => L(14, 74 + 104 * i, PH.w - 28, 92);
const priceRect = (i: number): Rect => L(118, 74 + 104 * i + 48, 92, 30);
const couponRect = L(20, 140, PH.w - 40, 250);
const panelRect = L(0, 334, PH.w, 248);
const panelPick = L(PH.w - 14 - 132, 334 + 92, 132, 54);

const PRODUCTS = [
  ["سمّاعة لاسلكية", "1,200 ج.م", "#C9E8E1"],
  ["شاحن سريع", "350 ج.م", "#F4DCC2"],
  ["حافظة هاتف", "180 ج.م", "#DCD8F4"],
];
const CARD = "4321 8765 0000 1234";

type Screen = "home" | "checkout" | "cart";
type St = {
  screen: Screen;
  ask?: number;
  askDone?: number;
  birthday?: number;
  rate?: number;
  typed?: number;
  promo?: number;
  promoStrike?: number;
  coupon?: number;
  panel?: number;
  picked?: number;
  pressRow?: number;
  pressed?: number;
};

const Header: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ height: 60, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", padding: "0 18px", fontSize: 22, fontWeight: 700 }}>{title}</div>
);

const Btn: React.FC<{ r: Rect; text: string; filled?: boolean; o?: number }> = ({ r, text, filled, o = 1 }) => (
  <div style={{ ...loc(r), borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, background: filled ? D.brand : "transparent", color: filled ? D.onBrand : D.brand, border: filled ? undefined : `2px solid ${C.border}`, opacity: o }}>{text}</div>
);

const Scrim: React.FC<{ p: number }> = ({ p }) => (p > 0 ? <div style={{ position: "absolute", inset: 0, background: "rgba(16,18,24,0.5)", opacity: p }} /> : null);

const Card: React.FC<{ r: Rect; p: number; children: React.ReactNode }> = ({ r, p, children }) => (
  <div style={{ ...loc(r), borderRadius: 18, background: "#FFFFFF", padding: 18, opacity: p, scale: String(0.92 + 0.08 * p), boxShadow: "0 16px 36px rgba(0,0,0,0.25)" }}>{children}</div>
);

const Home: React.FC<{ st: St }> = ({ st }) => {
  const a = st.ask ?? 0;
  return (
    <>
      <Header title="متجري" />
      {a > 0 ? (
        <div style={{ ...loc(askRect), height: (ASK_H - 12) * a, overflow: "hidden", borderRadius: 14, background: "#EAF6F3", border: `2px solid ${D.brand}`, padding: "12px 14px" }}>
          {(st.askDone ?? 0) > 0 ? (
            <div style={{ fontSize: 17, fontWeight: 700, color: D.brand, display: "flex", alignItems: "center", gap: 8, height: 80 }}>
              <IconCheck color={D.brand} size={24} stroke={2.6} /> تم الحفظ، شكرًا!
            </div>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>أضف تاريخ ميلادك لتصلك هدية؟</div>
              <div style={{ position: "absolute", top: 66, left: 14, display: "flex", gap: 8 }}>
                <div style={{ width: 92, height: 38, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: C.textMuted, boxSizing: "border-box" }}>لاحقًا</div>
              </div>
              <div style={{ ...loc(askYes), top: 66, left: undefined, right: 14, position: "absolute", borderRadius: 10, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>نعم</div>
            </>
          )}
        </div>
      ) : null}
      {PRODUCTS.map(([t, p, c], i) => {
        const r = rowRect(i, a);
        const pr = st.pressRow === i ? st.pressed ?? 0 : 0;
        return (
          <div key={t} style={{ ...loc(r), borderRadius: 14, background: pr > 0 ? `rgba(14,124,107,${0.14 * pr})` : C.surfaceAlt, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: 12, background: c, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{t}</div>
              <div style={{ fontSize: 16, color: D.brand, fontWeight: 700, marginTop: 4 }}>{p}</div>
            </div>
          </div>
        );
      })}
      <Scrim p={Math.max(st.birthday ?? 0, st.rate ?? 0)} />
      {(st.birthday ?? 0) > 0 ? (
        <Card r={dialogRect} p={st.birthday ?? 0}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>أضف تاريخ ميلادك</div>
          <div style={{ fontSize: 15, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>لنرسل لك هدية في يومك.</div>
          <div style={{ marginTop: 14, height: 48, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 16, color: C.textMuted }}>يوم / شهر / سنة</div>
        </Card>
      ) : null}
      {(st.birthday ?? 0) > 0 ? (
        <>
          <Btn r={saveBtn} text="حفظ" filled o={st.birthday} />
          <Btn r={{ ...saveBtn, x: saveBtn.x + 108 }} text="لاحقًا" o={st.birthday} />
        </>
      ) : null}
      {(st.rate ?? 0) > 0 ? (
        <Card r={rateRect} p={st.rate ?? 0}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>كيف كانت تجربتك؟</div>
          <div dir="ltr" style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 8, fontSize: 36, color: "#F2B530" }}>☆☆☆☆☆</div>
          <div style={{ marginTop: 18, height: 42, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>إرسال</div>
        </Card>
      ) : null}
    </>
  );
};

const Field: React.FC<{ r: Rect; label: string; value: string; caret?: boolean; ltr?: boolean }> = ({ r, label, value, caret, ltr }) => (
  <>
    <div style={{ ...loc({ ...r, y: r.y - 26, h: 22 }), fontSize: 14, fontWeight: 600, color: C.textMuted }}>{label}</div>
    <div dir={ltr ? "ltr" : "rtl"} style={{ ...loc(r), borderRadius: 10, border: `2px solid ${caret ? D.brand : C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 18, fontWeight: 600, color: C.text, letterSpacing: ltr ? 1 : 0 }}>
      {value}
      {caret ? <span style={{ width: 2, height: 22, background: D.brand, marginInlineStart: 2 }} /> : null}
    </div>
  </>
);

const Checkout: React.FC<{ st: St; frame: number }> = ({ st, frame }) => {
  const n = Math.round((st.typed ?? 0) * CARD.length);
  const typing = (st.typed ?? 0) < 1 && Math.floor(frame / 15) % 2 === 0;
  const p = st.promo ?? 0;
  return (
    <>
      <Header title="الدفع" />
      <div style={{ position: "absolute", top: 72, left: 14, right: 14, display: "flex", gap: 6 }}>
        {["الشحن ✓", "الدفع", "المراجعة"].map((t, i) => (
          <div key={t} style={{ flex: 1, height: 32, borderRadius: 999, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: i === 1 ? D.brand : C.surfaceAlt, color: i === 1 ? D.onBrand : C.textMuted }}>{t}</div>
        ))}
      </div>
      <Field r={cardField} label="رقم البطاقة" value={CARD.slice(0, n)} caret={typing || (st.typed ?? 0) < 1} ltr />
      <Field r={L(PH.w - 18 - 126, 258, 126, 48)} label="تاريخ الانتهاء" value="" />
      <Field r={L(18, 258, 126, 48)} label="CVV" value="" />
      <div style={{ position: "absolute", top: 330, left: 18, right: 18, fontSize: 16, color: C.text }}>
        {[["المنتجات", "1,550 ج.م"], ["الشحن", "50 ج.م"]].map(([a, b]) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", height: 34, color: C.textMuted }}><span>{a}</span><span>{b}</span></div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", height: 40, borderTop: `1px solid ${C.border}`, paddingTop: 8, fontWeight: 700, fontSize: 18 }}><span>الإجمالي</span><span>1,600 ج.م</span></div>
      </div>
      <div style={{ position: "absolute", left: 18, right: 18, bottom: 26, height: 54, borderRadius: 14, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>ادفع 1,600 ج.م</div>
      <Scrim p={p} />
      {p > 0 ? (
        <Card r={promoRect} p={p}>
          <div style={{ position: "absolute", top: 12, left: 14, fontSize: 20, color: C.textMuted }}>✕</div>
          <div style={{ height: 70, borderRadius: 12, background: "#FCE3EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: "#C2185B" }}>خصم 10%</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginTop: 14 }}>اشترك في رسائلنا البريدية!</div>
          <div style={{ marginTop: 12, height: 44, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: C.textMuted }}>بريدك الإلكتروني</div>
          <div style={{ marginTop: 12, height: 42, borderRadius: 12, background: "#C2185B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>اشترك الآن</div>
        </Card>
      ) : null}
      {(st.promoStrike ?? 0) > 0 ? (
        <svg style={{ ...loc(promoRect), overflow: "visible" }} viewBox={`0 0 ${promoRect.w} ${promoRect.h}`}>
          <path d={`M10 10 L${promoRect.w - 10} ${promoRect.h - 10} M${promoRect.w - 10} 10 L10 ${promoRect.h - 10}`} stroke={C.warning} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (st.promoStrike ?? 0)} fill="none" opacity={p} />
        </svg>
      ) : null}
    </>
  );
};

const Cart: React.FC<{ st: St }> = ({ st }) => {
  const c = st.coupon ?? 0;
  const pn = st.panel ?? 0;
  return (
    <>
      <Header title="السلة" />
      {PRODUCTS.slice(0, 3).map(([t, p, col], i) => (
        <div key={t} style={{ ...loc(cartRow(i)), borderRadius: 14, background: C.surfaceAlt, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 62, height: 62, borderRadius: 12, background: col, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{t}</div>
            <div style={{ fontSize: 18, color: D.brand, fontWeight: 700, marginTop: 6 }}>{p}</div>
          </div>
        </div>
      ))}
      <Scrim p={c} />
      {c > 0 ? (
        <Card r={couponRect} p={c}>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>كوبون خصم 20% على منتج واحد</div>
          <div style={{ fontSize: 15, color: C.textMuted, marginTop: 6 }}>على أي منتج تطبّقه؟</div>
          {["سمّاعة", "شاحن", "حافظة"].map((t, i) => (
            <div key={t} style={{ marginTop: 8, height: 34, display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: C.text }}>
              <span style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${C.textMuted}` }} />
              {t}
            </div>
          ))}
        </Card>
      ) : null}
      {pn > 0 ? (
        <div style={{ ...loc(panelRect), background: "#FFFFFF", borderTop: `3px solid ${D.brand}`, borderRadius: "20px 20px 0 0", boxShadow: "0 -10px 30px rgba(0,0,0,0.14)", padding: "16px 14px", translate: `0px ${(1 - pn) * panelRect.h}px` }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>كوبون خصم 20% على منتج واحد</div>
          <div style={{ fontSize: 15, color: C.textMuted, marginTop: 4 }}>اختر المنتج من السلة:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {["سمّاعة", "شاحن", "حافظة"].map((t, i) => {
              const on = i === 0 ? st.picked ?? 0 : 0;
              return (
                <div key={t} style={{ width: 132, height: 54, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 17, fontWeight: 700, boxSizing: "border-box", border: `2px solid ${on > 0.5 ? D.brand : C.border}`, background: on > 0.5 ? "#EAF6F3" : "#FFFFFF", color: on > 0.5 ? D.brand : C.text }}>
                  {on > 0.5 ? <IconCheck color={D.brand} size={20} stroke={2.6} /> : null}
                  {t}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
};

const Phone: React.FC<{ st: St; frame: number; fade: number }> = ({ st, frame, fade }) => (
  <div dir="rtl" style={{ position: "absolute", left: PH.x, top: PH.y, width: PH.w, height: PH.h, borderRadius: 30, background: "#FFFFFF", border: `2px solid ${C.border}`, boxShadow: T.shadow.viewport, overflow: "hidden", fontFamily: FONT, boxSizing: "border-box" }}>
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {st.screen === "home" ? <Home st={st} /> : st.screen === "checkout" ? <Checkout st={st} frame={frame} /> : <Cart st={st} />}
    </div>
  </div>
);

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

/** Left-side card listing when not to use a modal dialog. */
const RuleCard: React.FC<{ p: number; items: number[] }> = ({ p, items }) => {
  if (p <= 0) return null;
  const list = ["يمكن طلبها لاحقًا", "غير مهمة", "لا تساعد في الـ Flow الحالي"];
  return (
    <div dir="rtl" style={{ position: "absolute", left: 34, width: 440, top: 120, opacity: p, translate: `${(1 - p) * -16}px 0px`, fontFamily: FONT, background: "#FFFFFF", border: `2px solid ${C.border}`, borderRadius: 22, boxShadow: T.shadow.viewport, padding: "22px 26px", boxSizing: "border-box" }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.select, lineHeight: 1.4 }}>لا تستخدم Modal dialog إذا كانت المعلومة:</div>
      {list.map((t, i) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, height: 72, borderTop: `1px solid ${C.border}`, marginTop: i ? 0 : 12, opacity: items[i], translate: `${(1 - items[i]) * -20}px 0px` }}>
          <span style={{ width: 40, height: 40, borderRadius: 20, background: C.selectSoft, color: C.select, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
          <span style={{ fontSize: 29, fontWeight: 600, color: C.text }}>{t}</span>
        </div>
      ))}
    </div>
  );
};

export const C01: React.FC = () => {
  const frame = useCurrentFrame();
  const at = (sec: number) => s(sec);

  // beats (seconds, from the clip's caption timing)
  const tPop = at(0.8), tInspect = at(1.8), tLater = at(2.6), tMinor = at(5.3), tFix = at(9.3);
  const tAsk = at(10.0), tAskNote = at(10.6), tYes = at(14.2), tOpen = at(15.0), tOpenNote = at(16.0), tSave = at(20.4);
  const tRules = at(21.6), tR1 = at(23.8), tR2 = at(26.4), tR3 = at(28.4);
  const tIso = at(32.66), tIsoNote = at(33.4), tBehind = at(36.0), tFocus = at(38.0), tIsoOut = at(42.0);
  const tCheckout = at(42.6), tCoNote = at(43.6), tPromo = at(48.2), tCut = at(49.4), tCalm = at(53.1), tAnnoy = at(60.1), tStrike = at(62.4), tNoModal = at(63.4);
  const tCart = at(66.1), tCoupon = at(67.0), tNeed = at(68.0), tHidden = at(71.0), tOutside = at(73.1), tNonModal = at(76.0), tNmNote = at(77.0), tPick = at(80.0), tEnd = at(81.2);

  // ---- product state ------------------------------------------------------------------------
  const screen: Screen = frame < tCheckout ? "home" : frame < tCart ? "checkout" : "cart";
  const fade = frame < tCheckout ? exit(frame, tCheckout - 8, 8) : frame < tCart ? enter(frame, tCheckout, 10) * exit(frame, tCart - 8, 8) : enter(frame, tCart, 10);
  const st: St = {
    screen,
    ask: enter(frame, tAsk, 14) * exit(frame, tR1, 14),
    askDone: frame >= tSave + 6 ? 1 : 0,
    birthday: enter(frame, tPop, 10) * exit(frame, tFix, 8) + enter(frame, tOpen, 10) * exit(frame, tSave + 4, 8),
    rate: enter(frame, tIso, 10) * exit(frame, tIsoOut, 8),
    pressRow: 0,
    pressed: span(frame, tBehind - 2, tBehind + 10, 4) * 0, // the tap behind the dialog does nothing
    typed: Math.min(1, Math.max(0, (frame - at(44.0)) / (at(48.0) - at(44.0)))) * 0.55 + Math.min(1, Math.max(0, (frame - at(63.8)) / (at(65.6) - at(63.8)))) * 0.45,
    promo: enter(frame, tPromo, 10) * exit(frame, tStrike + 18, 10),
    promoStrike: Math.min(1, Math.max(0, (frame - tStrike) / 12)),
    coupon: enter(frame, tCoupon, 10) * exit(frame, tNonModal, 8),
    panel: enter(frame, tNonModal + 6, 16),
    picked: frame >= tPick ? 1 : 0,
  };

  // ---- camera -----------------------------------------------------------------------------
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  // push in on the phone, keeping its top (or, for the bottom panel, its bottom) on screen
  const push = (f: number, bottom = false) => ({ f, s: 1.12, fx: PH.x + PH.w / 2, fy: bottom ? PH.y + PH.h : PH.y, cx: 770, cy: bottom ? CONTENT.h - 10 : 12 });
  const shots: Shot[] = [
    { f: 0, ...overview },
    push(tInspect),
    { f: tRules, ...overview },
    push(tIso),
    { f: tCheckout, ...overview },
    push(tPromo + 4),
    { f: tNoModal + 20, ...overview },
    push(tNonModal + 10, true),
    { f: tEnd, ...overview },
  ];
  const cam = cameraAt(frame, shots);

  const mode: DebugMode = (frame >= tFix && frame < tRules) || (frame >= tStrike && frame < tCart) || frame >= tNonModal ? "compare" : frame < tInspect ? "live" : "inspect";
  const address = frame < tCheckout ? "shop.app" : frame < tCart ? "shop.app/checkout" : "shop.app/cart";

  // ---- focus dim --------------------------------------------------------------------------
  const dim = Math.max(span(frame, tInspect, tFix), span(frame, tIsoNote, tIsoOut), span(frame, tCut, tStrike + 24), span(frame, tHidden, tNonModal)) * 0.9;

  // ---- pointers ---------------------------------------------------------------------------
  const yes = camPoint(mid(askYes), cameraAt(tYes, shots));
  const save = camPoint(mid(saveBtn), cameraAt(tSave, shots));
  const behind = camPoint(mid(rowRect(2, 0)), cameraAt(tBehind, shots));
  const pick = camPoint(mid(panelPick), cameraAt(tPick, shots));
  const tap = (f: number, p: { x: number; y: number }, dx: number, dy: number) => ({ keys: [{ f: f - 22, x: p.x + dx, y: p.y + dy }, { f, ...p, click: true }, { f: f + 26, ...p }] as Key[], from: f - 24, to: f + 36 });
  const touches = [tap(tYes, yes, -60, 140), tap(tSave, save, -40, 150), tap(tBehind, behind, -70, 110), tap(tPick, pick, 40, 120)];

  const sel = (a: number, b: number) => enter(frame, a, 10) * exit(frame, b, 8);
  const wi = (I: React.FC<{ color: string; size?: number; stroke?: number }>) => <I color="#FFFFFF" size={30} stroke={2.4} />;
  const behindTag = camPoint({ x: rowRect(2, 0).x, y: rowRect(2, 0).y + rowRect(2, 0).h + 30 }, cameraAt(tBehind, shots));

  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      <Selection r={camRect(dialogRect, cam)} hover={sel(tInspect + 8, tFix)} selected={sel(tInspect + 8, tFix)} label="Modal dialog" />
      <SideNote y={120} text="يطلب معلومة يمكن أخذها لاحقًا" p={span(frame, tLater, tFix)} warn icon={wi(IconLock)} />
      <SideNote y={250} text="وهي ليست مهمة الآن" p={span(frame, tMinor, tFix)} warn />

      <Selection r={camRect(askRect, cam)} hover={sel(tAsk + 10, tOpen)} selected={sel(tAsk + 10, tOpen)} label="رسالة داخل الصفحة" />
      <SideNote y={120} text="اسأله أولًا داخل الصفحة" p={span(frame, tAskNote, tRules)} icon={wi(IconChat)} />
      <SideNote y={250} text="وافق؟ الآن افتح Dialog أو صفحة" p={span(frame, tOpenNote, tRules)} icon={wi(IconCheck)} />
      <Tag r={camRect({ x: dialogRect.x, y: dialogRect.y - 60, w: 0, h: 0 }, cam)} text="طلبه المستخدم" progress={span(frame, tOpen + 10, tSave)} icon={IconCheck} />

      <RuleCard p={span(frame, tRules + 4, tIso)} items={[enter(frame, tR1), enter(frame, tR2), enter(frame, tR3)]} />

      <Selection r={camRect(rateRect, cam)} hover={sel(tIsoNote, tIsoOut)} selected={sel(tIsoNote, tIsoOut)} label="Modal dialog" />
      <SideNote y={120} text="يعزل المستخدم عن محتوى الصفحة" p={span(frame, tIsoNote, tIsoOut)} icon={wi(IconLock)} />
      <Tag r={{ x: 0, y: behindTag.y, w: 0, h: 0 }} x={behindTag.x - 40} text="لا شيء يحدث" tone="warn" progress={span(frame, tBehind + 4, tFocus + 30)} />
      <SideNote y={260} text="ويجعله يركّز في الـ Dialog فقط" p={span(frame, tFocus, tIsoOut)} icon={wi(IconTarget)} />

      <SideNote y={120} text="المستخدم الآن في Checkout" p={span(frame, tCoNote, tCalm)} icon={wi(IconBag)} />
      <Tag r={camRect({ x: promoRect.x, y: promoRect.y - 40, w: 0, h: 0 }, cam)} text="يقطع خطوة حساسة" tone="warn" progress={span(frame, tCut, tStrike)} />
      <SideNote y={250} text="قلق · دقة · تركيز" p={span(frame, tCalm, tAnnoy)} big />
      <SideNote y={250} text="Modal dialog هنا مزعج جدًا" p={span(frame, tAnnoy, tNoModal)} warn big />
      <SideNote y={250} text="لا Modal dialog أثناء الـ Checkout" p={span(frame, tNoModal, tCart)} big icon={wi(IconCheck)} />

      <SideNote y={120} text="القرار يحتاج بيانات أخرى" p={span(frame, tNeed, tNonModal)} icon={wi(IconEye)} />
      <Tag r={camRect({ x: couponRect.x, y: couponRect.y + couponRect.h + 36, w: 0, h: 0 }, cam)} text="الأسعار مخفية خلفه" tone="warn" progress={span(frame, tHidden, tNonModal)} />
      <SideNote y={250} text="وهي موجودة خارج الـ Dialog" p={span(frame, tOutside, tNonModal)} warn />
      <Selection r={camRect(panelRect, cam)} hover={sel(tNonModal + 20, tEnd)} selected={sel(tNonModal + 20, tEnd)} label="Non-modal dialog" />
      {[0, 1, 2].map((i) => (
        <Selection key={i} r={camRect(priceRect(i), cam)} hover={sel(tNmNote + 10 + i * 4, tEnd)} selected={0} />
      ))}
      <SideNote y={120} text="استخدم Non-modal dialog أو صفحة" p={span(frame, tNmNote, tEnd + 6)} big icon={wi(IconCheck)} />
      <SideNote y={290} text="الأسعار ظاهرة أثناء القرار" p={span(frame, tNmNote + 30, tEnd + 6)} />
      <SideNote y={200} text="اعرض ما يحتاجه المستخدم وهو يقرّر" p={enter(frame, tEnd + 6)} big />

      {touches.map((t, i) => (
        <UserTouch key={i} frame={frame} keys={t.keys} from={t.from} to={t.to} />
      ))}
    </>
  );

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <DebuggerShell mode={mode} address={address} illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <Phone st={st} frame={frame} fade={fade} />
        </div>
      </DebuggerShell>

      {/* presenter: Eyad's own camera from the original recording */}
      <div style={{ position: "absolute", left: 40, top: 24, width: 236, height: 160, borderRadius: 20, overflow: "hidden", boxShadow: T.shadow.viewport, border: `2px solid ${C.border}`, background: "#000" }}>
        <OffthreadVideo src={staticFile("c01/cam.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div dir="rtl" style={{ position: "absolute", right: 8, bottom: 8, height: 30, padding: "0 12px", borderRadius: 999, background: "rgba(23,26,33,0.78)", color: "#FFFFFF", fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center" }}>إياد محمود</div>
      </div>
      <div dir="rtl" style={{ position: "absolute", left: 300, right: 40, top: 40, textAlign: "right" }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.text }}>متى لا تستخدم Modal dialog؟</div>
        <div dir="ltr" style={{ fontSize: 26, fontWeight: 600, color: C.textMuted, marginTop: 10, textAlign: "right" }}>Modal · Non-modal</div>
      </div>
      <Audio src={staticFile("c01/voice.m4a")} />
    </AbsoluteFill>
  );
};
