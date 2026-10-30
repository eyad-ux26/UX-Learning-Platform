import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconAlert, IconCheck, IconMenu } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, loc, mid, PH, PhoneFrame, phoneRect, Presenter, RecapCard, SideNote, TitleBand, v, Voice, wi } from "./p14";

/*
 * P14-C05 re-edit: WP 15 "don't fill a screen with same-style buttons" (83.3–124.5 s). Six filled buttons on a product
 * page collapse into one filled button and a menu; Eyad's voice and camera are kept.
 */
const VOICE = 41.2;
export const C05_FRAMES = clipFrames(VOICE);

const ACTIONS = ["أضف إلى السلة", "اشترِ الآن", "شارك", "احفظ", "قارن", "أبلغ عن مشكلة"];
const btnRect = (i: number): Rect => L(14 + (i % 2) * 140, 300 + Math.floor(i / 2) * 58, 132, 48);
const mainRect = L(166, 300, PH.w - 14 - 166, 50);
const buyRect = L(72, 300, 86, 50);
const moreRect = L(14, 300, 50, 50);
const menuRect = L(14, 356, 190, 4 * 44 + 12);

export const C05: React.FC = () => {
  const f = useCurrentFrame();
  const B = { action: v(3.38), notEvery: v(7.78), same: v(12.74), filled: v(17.34), many: v(20.24), group: v(24.64), menu: v(27.34), openMenu: v(30.4), notBest: v(33.92), first: v(39.8) };
  const END = v(VOICE) + 6;
  const fix = enter(f, B.menu, 18);
  const menu = enter(f, B.openMenu + 6, 10);

  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [{ f: 0, ...overview }];
  const cam = cameraAt(f, shots);
  const mode: DebugMode = f < B.action ? "live" : f >= B.menu ? "compare" : "inspect";
  const dim = span(f, B.same, B.menu) * 0.9;

  const more = camPoint(mid(moreRect), cam);
  const touches = [{ keys: [{ f: B.openMenu - 18, x: more.x - 30, y: more.y + 140 }, { f: B.openMenu, ...more, click: true }, { f: B.openMenu + 30, ...more }] as Key[], from: B.openMenu - 20, to: B.openMenu + 40 }];
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);

  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      <SideNote y={110} text="الـ Button يجعل المستخدم يأخذ Action" p={span(f, B.action, B.same)} />
      <SideNote y={250} text="لكن لا تضع Button لكل Action" p={span(f, B.notEvery, B.same)} big />
      {ACTIONS.map((a, i) => (
        <Selection key={a} r={camRect(btnRect(i), cam)} hover={sel(B.filled + i * 3, B.menu)} selected={0} label={i === 0 ? "Filled ×6" : undefined} />
      ))}
      <CaseChip y={40} text="Guideline 1" p={span(f, B.same, END)} />
      <SideNote y={110} text="6 أزرار Filled في شاشة واحدة" p={span(f, B.same, B.group)} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="مزعج: كلها تبدو بنفس الأهمية" p={span(f, B.many, B.group)} warn />
      <SideNote y={110} text="اجمع الباقي في Menu" p={span(f, B.group, END)} icon={wi(IconMenu)} />
      <Selection r={camRect(mainRect, cam)} hover={sel(B.menu + 14, END)} selected={sel(B.menu + 14, END)} label="Filled · الأهم" />
      <Selection r={camRect(buyRect, cam)} hover={sel(B.menu + 20, B.openMenu)} selected={0} label="Outlined" labelSide="left" />
      <Selection r={camRect(menuRect, cam)} hover={sel(B.openMenu + 16, END)} selected={sel(B.openMenu + 16, END)} label="Menu" labelSide="left" />
      <SideNote y={250} text="أو في Component أخرى تساعده على الـ Action" p={span(f, B.menu + 30, B.notBest)} />
      <SideNote y={250} text="لا تُكثر الأزرار، خاصة من نفس النوع" p={span(f, B.notBest, END)} big icon={wi(IconCheck)} />
      {touches.map((t, i) => (
        <UserTouch key={i} frame={f} keys={t.keys} from={t.from} to={t.to} />
      ))}
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="shop.app/product" illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <PhoneFrame>
            <Header title="سمّاعة لاسلكية" back />
            <div style={{ position: "absolute", top: 74, left: 14, right: 14, height: 150, borderRadius: 16, background: "#C9E8E1" }} />
            <div style={{ position: "absolute", top: 236, left: 14, right: 14, fontSize: 20, fontWeight: 700, color: C.text }}>سمّاعة لاسلكية</div>
            <div style={{ position: "absolute", top: 264, left: 14, right: 14, fontSize: 17, fontWeight: 700, color: D.brand }}>1,200 ج.م</div>
            <div style={{ opacity: 1 - fix }}>
              {ACTIONS.map((a, i) => (
                <div key={a} style={{ ...loc(btnRect(i)), borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, scale: String(1 - fix * 0.1) }}>{a}</div>
              ))}
            </div>
            {fix > 0 ? (
              <div style={{ opacity: fix }}>
                <div style={{ ...loc(mainRect), borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700 }}>أضف إلى السلة</div>
                <div style={{ ...loc(buyRect), borderRadius: 12, border: `2px solid ${D.brand}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: D.brand }}>اشترِ الآن</div>
                <div style={{ ...loc(moreRect), borderRadius: 12, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: C.text }}>⋯</div>
                <div style={{ position: "absolute", top: 366, left: 14, right: 14, fontSize: 14, color: C.textMuted, lineHeight: 1.6, opacity: 1 - menu }}>صوت نقي وعزل للضوضاء، وبطارية حتى 30 ساعة.</div>
              </div>
            ) : null}
            {menu > 0 ? (
              <div style={{ ...loc(menuRect), borderRadius: 14, background: "#FFFFFF", boxShadow: "0 12px 30px rgba(0,0,0,0.22)", padding: "6px 0", opacity: menu, scale: String(0.9 + 0.1 * menu), transformOrigin: "top left" }}>
                {ACTIONS.slice(2).map((a) => (
                  <div key={a} style={{ height: 44, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 16, fontWeight: 600, color: C.text }}>{a}</div>
                ))}
              </div>
            ) : null}
          </PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c05/cam.mp4" />
      <TitleBand title="أزرار كثيرة في شاشة واحدة؟" sub="Buttons · Menu" />
      <Voice src="c05/voice.m4a" />
      <IntroCard title="لا تملأ الشاشة بأزرار متشابهة" sub="Buttons" points={["Guideline 1"]} />
      <RecapCard
        voiceSec={VOICE}
        title="زر واضح للأهم، والباقي في Menu"
        items={[
          { text: "Button للإجراء الأهم في الشاشة" },
          { text: "الإجراءات الأخرى في Menu أو Component أخرى" },
          { text: "أزرار كثيرة من نفس النوع في شاشة واحدة", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
