import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { D } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { LEFT, ONE, Opt, Panel, Q, R, RIGHT, Small, Verdict } from "./ctl";

/*
 * P14-C11 re-edit: WP 4 continued (258.85–530.46 s), rebuilt from the source slides: radios on the left against a
 * dropdown on the right, no default on the left against a default on the right, a complete job list, no nested radios,
 * a radio that switches airplane mode at once (wrong) against choices applied with Next, and the clickable area.
 */
const VOICE = 271.62;
const vc = vCut("c11");
const VOICE_CUT = cutSec(VOICE, cutsOf("c11"));
export const C11_FRAMES = clipFrames(VOICE_CUT);

const PLANS = ["مجانية: 0 ج.م أسبوعيًا", "مميّزة: 15 ج.م أسبوعيًا", "بريميوم: 30 ج.م أسبوعيًا"];
const JOBS = ["مهندس", "طبيب", "معلّم"];

const Dropdown: React.FC<{ open: number }> = ({ open }) => (
  <>
    <div style={{ height: 44, borderRadius: 8, border: "1.5px solid #8A929E", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", fontSize: 20, color: "#6B7280" }}>
      <span>اختر الباقة…</span>
      <span>⌄</span>
    </div>
    {open > 0.05 ? (
      <div style={{ marginTop: 4, borderRadius: 8, border: "1.5px solid #D5DAE1", overflow: "hidden", opacity: open }}>
        {PLANS.map((t, i) => (<div key={t} style={{ height: 40, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 19, background: i === 0 ? D.brand : "#FFFFFF", color: i === 0 ? D.onBrand : "#1F2328" }}>{t}</div>))}
      </div>
    ) : null}
  </>
);

const SetRow: React.FC<{ icon: string; label: string; end: React.ReactNode; grey?: boolean }> = ({ icon, label, end, grey }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, height: 52, borderBottom: "1px solid #E5E7EB", fontSize: 21, color: grey ? "#9CA3AF" : "#1F2328" }}>
    <span style={{ width: 26, height: 26, borderRadius: 7, background: icon, opacity: grey ? 0.5 : 1 }} />
    <span style={{ flex: 1 }}>{label}</span>
    <span style={{ fontSize: 20, color: "#9CA3AF" }}>{end}</span>
  </div>
);

export const C11: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    plan: vc(0.5), which: vc(10.2), few: vc(16.6), seen: vc(22.3), small: vc(29.8), why: vc(42.7), rule: vc(53.2),
    def: vc(61.2), left: vc(65.8), right: vc(69.8), noback: vc(73.1), err: vc(93.6),
    all: vc(104.5), jobs: vc(113.8), stuck: vc(129.1), other: vc(132.3), full: vc(136.6),
    nest: vc(140.8), pc: vc(145.7), radnest: vc(154.1), confuse: vc(161.4), chkok: vc(175.6), why3: vc(186.9),
    act: vc(199.0), mistake: vc(208.8), tap: vc(213.5), setting: vc(218.7), flow: vc(226.7), next: vc(230.2), only: vc(235.3),
    area: vc(251.9), whole: vc(255.1), harder: vc(267.4),
  };
  const END = vc(VOICE) + 6;
  type Scene = "plan" | "def" | "all" | "nest" | "act" | "next" | "area";
  const scene: Scene = f < B.def ? "plan" : f < B.all ? "def" : f < B.nest ? "all" : f < B.act ? "nest" : f < B.setting ? "act" : f < B.area ? "next" : "area";
  const cuts = [B.def, B.all, B.nest, B.act, B.setting, B.area];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const mode: DebugMode = scene === "plan" || scene === "def" ? "compare" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const on = (a: number) => (f >= a ? 1 : 0);
  const sub = (r: R, dx: number, dy: number, w: number, h: number): R => ({ x: r.x + dx, y: r.y + dy, w, h });
  const airOn = f >= B.tap;

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "plan" ? (
        <>
          <Panel r={LEFT} head="مسار" dim={span(f, B.small, B.def)}>
            <Small text="اختر الباقة" />
            {PLANS.map((p, i) => (<Opt key={p} label={p} kind="radio" on={i === 0 ? 1 : 0} />))}
          </Panel>
          <Panel r={RIGHT} head="مسار" dim={span(f, B.small, B.def)}>
            <Small text="اختر الباقة" />
            <Dropdown open={enter(f, B.plan + 20, 12)} />
          </Panel>
        </>
      ) : null}

      {scene === "def" ? (
        <>
          <Panel r={LEFT} head="مسار">
            <Small text="اختر الباقة" />
            {PLANS.map((p) => (<Opt key={p} label={p} kind="radio" />))}
            {f >= B.err ? <div style={{ fontSize: 19, fontWeight: 700, color: "#B4532A", marginTop: 8 }}>اختر باقة أولًا</div> : null}
          </Panel>
          <Panel r={RIGHT} head="مسار">
            <Small text="اختر الباقة" />
            {PLANS.map((p, i) => (<Opt key={p} label={p} kind="radio" on={i === 0 ? 1 : 0} />))}
          </Panel>
        </>
      ) : null}

      {scene === "all" ? (
        <Panel r={ONE} head="إنشاء حساب">
          <Small text="اختر وظيفتك لإنشاء حسابك" />
          {JOBS.map((j, i) => (<Opt key={j} label={j} kind="radio" on={i === 0 && f < B.other + 40 ? 1 : 0} />))}
          <Opt label="أخرى" kind="radio" on={on(B.other + 40)} o={enter(f, B.other, 12)} />
          {f >= B.other + 30 ? (
            <div style={{ height: 40, marginTop: 6, borderRadius: 8, border: "1.5px solid #8A929E", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 21, color: "#6B7280", opacity: enter(f, B.other + 30, 12) }}>اكتب وظيفتك</div>
          ) : null}
        </Panel>
      ) : null}

      {scene === "nest" ? (
        <Panel r={ONE}>
          {f < B.chkok ? <Q text="أين الخطأ؟" /> : <Small text="Checkboxes: Parent-child relationship" muted />}
          <Opt label="الاختيار 1" kind={f < B.chkok ? "radio" : "check"} on={1} />
          <div style={{ paddingInlineStart: 30 }}>
            <Opt label="الاختيار 1.1" kind={f < B.chkok ? "radio" : "check"} on={1} />
            <Opt label="الاختيار 1.2" kind={f < B.chkok ? "radio" : "check"} on={1} />
          </div>
          <Opt label="الاختيار 2" kind={f < B.chkok ? "radio" : "check"} />
          <Opt label="الاختيار 3" kind={f < B.chkok ? "radio" : "check"} />
        </Panel>
      ) : null}

      {scene === "act" ? (
        <Panel r={ONE}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>الإعدادات</div>
          <SetRow icon="#F59E0B" label="وضع الطيران" end={<Opt label="" kind="radio" on={airOn ? 1 : 0} size={20} h={30} />} />
          <SetRow icon="#3B82F6" label="Wi-Fi" end="Off" />
          <SetRow icon="#3B82F6" label="Bluetooth" end={airOn ? "Off" : "On"} />
          <SetRow icon="#22C55E" label="الشبكة الخلوية" end={airOn ? "وضع الطيران" : ""} grey={airOn} />
          <SetRow icon="#22C55E" label="نقطة الاتصال الشخصية" end="Off" grey={airOn} />
        </Panel>
      ) : null}

      {scene === "next" ? (
        <Panel r={ONE} head="إنشاء حساب">
          <Small text="اختر وظيفتك لإنشاء حسابك" />
          {[...JOBS, "أخرى"].map((j, i) => (<Opt key={j} label={j} kind="radio" on={(f < B.flow ? i === 0 : i === 1) ? 1 : 0} />))}
          <div style={{ width: 130, height: 42, marginTop: 14, borderRadius: 10, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 700, scale: f >= B.next && f < B.next + 6 ? "0.95" : "1" }}>التالي</div>
          {f >= B.next + 6 ? <div style={{ fontSize: 20, color: "#1F7A52", fontWeight: 700, marginTop: 10, opacity: enter(f, B.next + 6, 10) }}>تم حفظ الوظيفة: طبيب</div> : null}
        </Panel>
      ) : null}

      {scene === "area" ? (
        <Panel r={ONE}>
          <Small text="9. Clickable area" muted />
          <div style={{ display: "inline-flex", marginTop: 30, padding: "4px 14px", borderRadius: 10, background: f >= B.whole ? "#E5E7EB" : "transparent" }}>
            <Opt label="الباقة الشهرية" kind="radio" on={on(B.whole + 50)} fs={20} size={26} h={48} />
          </div>
        </Panel>
      ) : null}
    </div>
  );

  const overlay = (
    <>
      <CaseChip y={40} text="1 · Radios أم Dropdown؟" p={span(f, B.plan, B.def)} />
      <SideNote w={360} y={110} text="أيّهما أفضل: يسار أم يمين؟" p={span(f, B.which, B.few)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="اختيارات قليلة: Radio buttons أفضل" p={span(f, B.few, B.small)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="كل الاختيارات ظاهرة دون فتح قائمة" p={span(f, B.seen, B.small)} />
      <SideNote w={360} y={110} text="لا مساحة على الـ Mobile؟ Dropdown مقبول" p={span(f, B.small, B.def)} icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="تخالف القاعدة، لكن لسبب واضح" p={span(f, B.why, B.def)} />
      <SideNote w={360} y={390} text="والأفضل أن نتبع الـ Guidelines عمومًا" p={span(f, B.rule, B.def)} />

      <CaseChip y={40} text="2 · اختيار افتراضي" p={span(f, B.def, B.all)} />
      <SideNote w={360} y={110} text="أيّهما أفضل كبداية؟" p={span(f, B.def, B.left)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="يسار: لا شيء مختار" p={span(f, B.left, B.right)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="يمين: اختيار مختار by default" p={span(f, B.right, B.all)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="بعد أول اختيار لا يعود لحالة «لا شيء»" p={span(f, B.noback, B.all)} />
      <SideNote w={360} y={390} text="وإن تابع دون اختيار ظهر خطأ" p={span(f, B.err, B.all)} warn />

      <CaseChip y={40} text="3 · اختيارات شاملة" p={span(f, B.all, B.nest)} />
      <SideNote w={360} y={110} text="Comprehensive: تغطي كل الحالات" p={span(f, B.all, B.stuck)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="وظيفته ليست هنا؟ يتوقف ولا يعرف ماذا يكتب" p={span(f, B.stuck, B.other)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="أضف «أخرى» ومكانًا يكتب فيه" p={span(f, B.other, B.nest)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="4 · لا Radios متداخلة" p={span(f, B.nest, B.act)} />
      <SideNote w={360} y={110} text="Nested: اختيار داخل اختيار" p={span(f, B.pc, B.radnest)} />
      <Selection r={sub(ONE, ONE.w - 330, 56, 316, 176)} hover={sel(B.radnest, B.chkok)} selected={sel(B.confuse, B.chkok)} label="Parent والـ Children" />
      <SideNote w={360} y={110} text="Radio لا يختار أكثر من واحد أصلًا" p={span(f, B.radnest, B.chkok)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="هل اخترت الأب فقط أم كل ما تحته؟" p={span(f, B.confuse, B.chkok)} warn />
      <SideNote w={360} y={110} text="Checkboxes تسمح بذلك" p={span(f, B.chkok, B.act)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="5 · متى يتنفّذ الاختيار؟" p={span(f, B.act, B.area)} />
      <SideNote w={360} y={110} text="أين الخطأ؟ فكّر قبل أن تكمل" p={span(f, B.act, B.mistake)} icon={wi(IconEye)} />
      <Selection r={sub(ONE, 12, 60, 496, 56)} hover={sel(B.mistake, B.setting)} selected={sel(B.tap, B.setting)} label="ينفّذ فورًا" />
      <SideNote w={360} y={110} text="الضغط على الـ Radio شغّل وضع الطيران فورًا" p={span(f, B.mistake, B.setting)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="Radio والـ Checkbox يغيّران Setting فقط" p={span(f, B.setting, B.only)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="ويتنفّذ التغيير بزر مثل «التالي»" p={span(f, B.flow, B.area)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="الاستثناء: Checkbox مستقل في الـ Desktop" p={span(f, B.only, B.area)} />

      <CaseChip y={40} text="6 · منطقة الضغط" p={span(f, B.area, END)} />
      <Selection r={sub(ONE, ONE.w - 300, 78, 280, 66)} hover={sel(B.whole, END)} selected={sel(B.whole + 20, END)} label="Clickable area" />
      <SideNote w={360} y={110} text="الضغط على الدائرة أو الكلمة يختار" p={span(f, B.whole, B.harder)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="الدائرة وحدها هدف صغير وصعب" p={span(f, B.harder, END)} warn icon={wi(IconAlert)} />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={scene === "act" ? "settings.app" : "masar.app/join"} illustrative overlay={overlay}>
        {product}
        <Verdict r={LEFT} good p={scene === "plan" ? span(f, B.few, B.def) : 0} />
        <Verdict r={RIGHT} good={false} p={scene === "plan" ? span(f, B.few, B.small) : 0} />
        <Verdict r={LEFT} good={false} p={scene === "def" ? span(f, B.left, B.all) : 0} />
        <Verdict r={RIGHT} good p={scene === "def" ? span(f, B.right, B.all) : 0} />
      </DebuggerShell>
      <Presenter cam="c11/cam.mp4" />
      <TitleBand title="إرشادات Radio buttons" sub="Radio buttons" />
      <Voice src="c11/voice.m4a" />
      <IntroCard title="Radio buttons يثق بها الناس" sub="Radio buttons" points={["Radio أم Dropdown", "Default واختيارات شاملة", "متى يتنفّذ الاختيار"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="Radio buttons يثق بها الناس"
        items={[
          { text: "اختيارات قليلة: Radios بدل Dropdown" },
          { text: "اختيار افتراضي، واختيارات شاملة" },
          { text: "لا Radios متداخلة" },
          { text: "يتنفّذ الاختيار بزر، والكلمة قابلة للضغط" },
        ]}
      />
    </AbsoluteFill>
  );
};
