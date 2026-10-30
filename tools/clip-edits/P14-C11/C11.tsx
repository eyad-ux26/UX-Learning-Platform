import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camRect, camStyle, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, PH, PhoneFrame, Presenter, RecapCard, SideNote, TitleBand, v, Voice, wi } from "./p14";
import { Group, Opt } from "./ctl";

/*
 * P14-C11 re-edit: WP 4 continued, "radio button guidelines" (258.85–530.5 s). A subscription app and a sign-up form
 * show radios versus a dropdown, a default choice, a complete set, no nested radios, and when the action happens.
 */
const VOICE = 271.62;
export const C11_FRAMES = clipFrames(VOICE);

const PLANS = ["شهري", "ربع سنوي", "سنوي"];

const Dropdown: React.FC<{ label: string; open?: number; items?: string[] }> = ({ label, open = 0, items = [] }) => (
  <>
    <div style={{ height: 46, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", fontSize: 17, color: C.text }}>
      <span>{label}</span>
      <span style={{ color: C.textMuted }}>⌄</span>
    </div>
    {open > 0.05 ? (
      <div style={{ marginTop: 4, borderRadius: 10, border: `2px solid ${C.border}`, background: "#FFFFFF", opacity: open, overflow: "hidden" }}>
        {items.map((t) => (<div key={t} style={{ height: 40, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, color: C.text }}>{t}</div>))}
      </div>
    ) : null}
  </>
);

export const C11: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    plan: v(0.5), radios: v(2.8), drop: v(7.6), which: v(10.2), few: v(16.6), seen: v(22.3), small: v(34.5), why: v(42.7), rule: v(53.2),
    def: v(61.2), nodef: v(65.8), withdef: v(69.8), noback: v(73.1), err: v(93.6),
    all: v(104.5), jobs: v(116.3), stuck: v(129.1), other: v(132.3), full: v(136.6),
    nest: v(140.8), pc: v(145.7), radnest: v(154.1), confuse: v(161.4), chkok: v(175.6), why3: v(186.9),
    act: v(199.0), airplane: v(211.2), tap: v(214.7), next: v(222.7), flow: v(228.6), only: v(235.3),
    area: v(251.9), whole: v(255.1), harder: v(267.4),
  };
  const END = v(VOICE) + 6;
  type Scene = "plan" | "def" | "all" | "nest" | "act" | "area";
  const scene: Scene = f < B.def ? "plan" : f < B.all ? "def" : f < B.nest ? "all" : f < B.act ? "nest" : f < B.area ? "act" : "area";
  const cuts = [B.def, B.all, B.nest, B.act, B.area];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));

  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [{ f: 0, ...overview }];
  const cam = cameraAt(f, shots);
  const mode: DebugMode = f < B.plan ? "live" : f >= B.act && f < B.next ? "compare" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const r = (x: number, y: number, w: number, h: number) => camRect(L(x, y, w, h), cam);
  const dim = Math.max(span(f, B.stuck, B.other), span(f, B.confuse, B.chkok)) * 0.5;
  const on = (a: number) => (f >= a ? 1 : 0);

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="masar.app/join" illustrative overlay={
        <>
          <FocusDim r={camRect(L(0, 0, PH.w, PH.h), cam)} amount={dim} pad={8} />

          <CaseChip y={40} text="1 · Radios أم Dropdown؟" p={span(f, B.plan, B.def)} />
          <SideNote y={110} text="قليلة؟ استخدم Radio buttons" p={span(f, B.few, B.small)} icon={wi(IconCheck)} />
          <Selection r={r(14, 80, 272, 150)} hover={sel(B.seen, B.small)} selected={sel(B.seen, B.small)} label="كلها ظاهرة" />
          <SideNote y={250} text="أرى كل الاختيارات دون فتح قائمة" p={span(f, B.seen, B.small)} />
          <SideNote y={110} text="لا مساحة؟ Dropdown على الموبايل مقبول" p={span(f, B.small, B.def)} icon={wi(IconEye)} />
          <SideNote y={250} text="تخالف القاعدة، لكن لسبب واضح" p={span(f, B.why, B.def)} />
          <SideNote y={390} text="والأفضل أن نتبع الإرشادات عمومًا" p={span(f, B.rule, B.def)} />

          <CaseChip y={40} text="2 · اختيار افتراضي" p={span(f, B.def, B.all)} />
          <SideNote y={110} text="ابدأ بـ Radio واحد مختار by default" p={span(f, B.withdef, B.all)} big icon={wi(IconCheck)} />
          <SideNote y={110} text="لا شيء مختار" p={span(f, B.nodef, B.withdef)} warn icon={wi(IconAlert)} />
          <SideNote y={250} text="بعد أول اختيار لا يمكنه العودة لهذه الحالة" p={span(f, B.noback, B.all)} />
          <SideNote y={390} text="ولو ضغط «متابعة» ظهر له خطأ" p={span(f, B.err, B.all)} warn />

          <CaseChip y={40} text="3 · مجموعة شاملة" p={span(f, B.all, B.nest)} />
          <SideNote y={110} text="اجعل الاختيارات تشمل كل الحالات" p={span(f, B.all, B.stuck)} icon={wi(IconCheck)} />
          <SideNote y={110} text="مهنة غير موجودة؟ يتوقف المستخدم" p={span(f, B.stuck, B.other)} warn icon={wi(IconAlert)} />
          <SideNote y={110} text="أضف «أخرى» وحقل يكتب فيه" p={span(f, B.other, B.nest)} icon={wi(IconCheck)} />

          <CaseChip y={40} text="4 · لا Nested Radios" p={span(f, B.nest, B.act)} />
          <SideNote y={110} text="Parent-child: اختيار داخل اختيار" p={span(f, B.pc, B.radnest)} />
          <SideNote y={110} text="Radios داخل Radio: غير مفهوم" p={span(f, B.radnest, B.chkok)} warn icon={wi(IconAlert)} />
          <SideNote y={250} text="هل اخترت الأب فقط، أم كل الأبناء؟" p={span(f, B.confuse, B.chkok)} warn />
          <SideNote y={110} text="Checkboxes يمكنها ذلك" p={span(f, B.chkok, B.act)} icon={wi(IconCheck)} />
          <SideNote y={250} text="Radio لا يختار أكثر من واحد أصلًا" p={span(f, B.why3, B.act)} />

          <CaseChip y={40} text="5 · متى يحدث الإجراء؟" p={span(f, B.act, B.area)} />
          <SideNote y={110} text="Radio أو Checkbox لا ينفّذ فورًا" p={span(f, B.airplane, B.tap)} warn icon={wi(IconAlert)} />
          <SideNote y={110} text="يغيّر Setting أو يجمع اختيارات" p={span(f, B.tap, B.flow)} />
          <SideNote y={250} text="التنفيذ بعد زر مثل «التالي»" p={span(f, B.next, B.area)} icon={wi(IconCheck)} />
          <SideNote y={390} text="الاستثناء: Checkbox مستقل في الـ Desktop" p={span(f, B.only, B.area)} />

          <CaseChip y={40} text="6 · منطقة الضغط" p={span(f, B.area, END)} />
          <Selection r={r(14, 100, 272, 44)} hover={sel(B.whole, END)} selected={sel(B.whole, END)} label="Control + Label" />
          <SideNote y={110} text="اجعل الضغط على الاثنين معًا" p={span(f, B.whole, B.harder)} big icon={wi(IconCheck)} />
          <SideNote y={250} text="Control وكلمته كلاهما Clickable" p={span(f, B.whole + 60, END)} />
          <SideNote y={110} text="وإلا قلّ الـ Accessibility وصعب الاستخدام" p={span(f, B.harder, END)} warn icon={wi(IconAlert)} />
        </>
      }>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>
            <Header title={scene === "act" ? "الإعدادات" : "انضم إلى مسار"} />

            {scene === "plan" ? (
              f < B.drop ? (
                <Group title="الباقة" top={80} o={enter(f, B.radios, 12)}>
                  {PLANS.map((p, i) => (<Opt key={p} label={p} kind="radio" on={i === 0 ? 1 : 0} />))}
                </Group>
              ) : f < B.few ? (
                <Group title="الباقة" top={80}>
                  <Dropdown label="اختر الباقة" open={enter(f, B.which, 12)} items={PLANS} />
                </Group>
              ) : f < B.small ? (
                <Group title="الباقة" top={80}>
                  {PLANS.map((p, i) => (<Opt key={p} label={p} kind="radio" on={i === 0 ? 1 : 0} />))}
                </Group>
              ) : (
                <Group title="الباقة" top={80}>
                  <Dropdown label="شهري" open={enter(f, B.why, 12)} items={PLANS} />
                </Group>
              )
            ) : null}

            {scene === "def" ? (
              <>
                <Group title="الباقة" top={80}>
                  {PLANS.map((p, i) => (<Opt key={p} label={p} kind="radio" on={f >= B.withdef && i === 0 ? 1 : 0} />))}
                </Group>
                {f >= B.err && f < B.all ? (
                  <div style={{ position: "absolute", left: 18, right: 18, top: 240, fontSize: 15, fontWeight: 700, color: C.warning, opacity: enter(f, B.err, 10) }}>لم تختر الباقة بعد</div>
                ) : null}
              </>
            ) : null}

            {scene === "all" ? (
              <>
                <Group title="ما وظيفتك؟" top={80}>
                  <Opt label="مهندس" kind="radio" />
                  <Opt label="طبيب" kind="radio" />
                  <Opt label="معلّم" kind="radio" />
                  <Opt label="أخرى" kind="radio" on={on(B.other + 40)} o={enter(f, B.other, 12)} />
                </Group>
                {f >= B.other + 30 ? (
                  <div style={{ position: "absolute", left: 18, right: 18, top: 290, height: 44, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, color: C.textMuted, opacity: enter(f, B.other + 30, 12) }}>اكتب وظيفتك</div>
                ) : null}
              </>
            ) : null}

            {scene === "nest" ? (
              <Group title="الإشعارات" top={80}>
                {f < B.chkok ? (
                  <>
                    <Opt label="كل الإشعارات" kind="radio" on={1} />
                    <div style={{ paddingInlineStart: 34 }}>
                      <Opt label="الرسائل" kind="radio" o={enter(f, B.radnest, 12)} />
                      <Opt label="العروض" kind="radio" o={enter(f, B.radnest + 10, 12)} />
                    </div>
                  </>
                ) : (
                  <>
                    <Opt label="كل الإشعارات" kind="check" on={1} />
                    <div style={{ paddingInlineStart: 34 }}>
                      <Opt label="الرسائل" kind="check" on={1} />
                      <Opt label="العروض" kind="check" on={1} />
                    </div>
                  </>
                )}
              </Group>
            ) : null}

            {scene === "act" ? (
              f < B.next ? (
                <>
                  <Group title="الاتصال" top={80}>
                    <Opt label="وضع الطيران" kind="check" on={on(B.tap)} />
                  </Group>
                  {f >= B.tap ? (
                    <div style={{ position: "absolute", left: 18, right: 18, top: 200, borderRadius: 10, background: "#1F2328", color: "#FFFFFF", fontSize: 15, padding: "10px 14px", opacity: enter(f, B.tap, 10) }}>شُغّل وضع الطيران الآن</div>
                  ) : null}
                </>
              ) : (
                <>
                  <Group title="ما وظيفتك؟" top={80}>
                    <Opt label="مهندس" kind="radio" />
                    <Opt label="طبيب" kind="radio" on={on(B.flow - 30)} />
                    <Opt label="معلّم" kind="radio" />
                  </Group>
                  <div style={{ position: "absolute", left: 18, right: 18, top: 250, height: 46, borderRadius: 12, background: D.brand, color: D.onBrand, fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>التالي</div>
                </>
              )
            ) : null}

            {scene === "area" ? (
              <Group title="الباقة" top={80}>
                <Opt label="شهري" kind="radio" on={on(B.whole + 40)} />
                <Opt label="سنوي" kind="radio" />
              </Group>
            ) : null}
          </PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c11/cam.mp4" />
      <TitleBand title="إرشادات Radio buttons" sub="Radio buttons" />
      <Voice src="c11/voice.m4a" />
      <IntroCard title="Radio buttons: ست قواعد" sub="Radio buttons" points={["Radio أم Dropdown", "Default وخيارات كاملة", "متى ينفَّذ الاختيار"]} />
      <RecapCard
        voiceSec={VOICE}
        title="Radio buttons يثق بها الناس"
        items={[
          { text: "اختيارات قليلة: Radios بدل Dropdown" },
          { text: "اختيار افتراضي، ومجموعة شاملة" },
          { text: "لا Radios متداخلة" },
          { text: "الضغط على الـ Control والكلمة معًا" },
        ]}
      />
    </AbsoluteFill>
  );
};
