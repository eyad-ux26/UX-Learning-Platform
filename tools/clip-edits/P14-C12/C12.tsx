import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { SelectionOn } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { LEFT, Marker, ONE, Panel, Q, R, RIGHT, Small, Toggle, Verdict } from "./ctl";

/*
 * P14-C12 re-edit: WP 5 "toggle switch" (0–192.4 s), rebuilt from the source slides: the off and on states, a flight
 * search toggle shown off on the left and on on the right (wrong: nothing happens until Search), airplane mode as the
 * right use, a long negative label against short direct ones, a lone "Off" that reads like a label, and the two fixes.
 */
const VOICE = 192.43;
const vc = vCut("c12");
const VOICE_CUT = cutSec(VOICE, cutsOf("c12"));
export const C12_FRAMES = clipFrames(VOICE_CUT);

const Row: React.FC<{ label: string; on: number; grey?: boolean; fs?: number; end?: React.ReactNode; sel?: string }> = ({ label, on, grey, fs = 21, end, sel }) => (
  <div data-sel={sel} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 54, borderBottom: "1px solid #E5E7EB", fontSize: fs, color: grey ? "#9CA3AF" : "#1F2328" }}>
    <span style={{ flex: 1, lineHeight: 1.4 }}>{label}</span>
    {end ?? <Toggle on={on} w={44} />}
  </div>
);

export const C12: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    rep: vc(0.5), flip: vc(7.9), def: vc(13.6), bulb: vc(18.2), unlike: vc(27.8), now: vc(36.7), replace: vc(39.2), diff: vc(42.5),
    air: vc(51.1), nearby: vc(58.9), tgl: vc(63.3), q: vc(70.8), wrong: vc(77.3), setting: vc(82.0), results: vc(87.0), imm: vc(92.1), plane: vc(95.2),
    label: vc(103.4), reads: vc(112.1), long: vc(115.4), neg: vc(119.4), fix: vc(125.8),
    state: vc(136.9), which: vc(140.3), guide: vc(150.1), sides: vc(151.8), beside: vc(168.4), color: vc(173.0), both: vc(182.7), single: vc(186.1),
  };
  const END = vc(VOICE) + 6;
  type Scene = "rep" | "def" | "air" | "imm" | "label" | "fix" | "state" | "sides" | "beside";
  const scene: Scene =
    f < B.def ? "rep" : f < B.air ? "def" : f < B.imm ? "air" : f < B.label ? "imm" : f < B.fix ? "label" : f < B.state ? "fix" : f < B.sides ? "state" : f < B.beside ? "sides" : "beside";
  const cuts = [B.def, B.air, B.imm, B.label, B.fix, B.state, B.sides, B.beside];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const mode: DebugMode = f < B.rep ? "live" : scene === "air" || scene === "imm" || scene === "beside" ? "compare" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  // the demo toggle switches on and back off while the trainer says it "turns on and off like this"
  const demo = enter(f, B.flip, 8) * exit(f, B.flip + 45, 8);
  const address = scene === "air" ? "ghayma.app/flights" : scene === "imm" ? "settings.app" : scene === "label" ? "shop.app/filters" : scene === "fix" ? "calendar.app/settings" : "settings.app/privacy";

  const flight = (r: R, onState: number, key?: string) => (
    <Panel r={r} head="اختر مطار المغادرة">
      <div style={{ height: 44, borderRadius: 8, background: "#F3F4F6", display: "flex", alignItems: "center", padding: "0 10px", fontSize: 20, color: "#6B7280", marginBottom: 6 }}>من</div>
      <Row label="ابحث في المطارات القريبة (160 كم)" on={onState} fs={19} sel={key} />
      <div style={{ height: 150, borderRadius: 10, background: "#F3F4F6", marginTop: 10 }} />
    </Panel>
  );
  const settings = (r: R, air: boolean) => (
    <Panel r={r}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>الإعدادات</div>
      <Row label="وضع الطيران" on={air ? 1 : 0} fs={20} />
      <Row label="Wi-Fi" on={0} fs={20} end={<span style={{ fontSize: 19, color: "#9CA3AF" }}>Off</span>} />
      <Row label="Bluetooth" on={0} fs={20} end={<span style={{ fontSize: 19, color: "#9CA3AF" }}>On</span>} />
      <Row label="الشبكة الخلوية" on={0} fs={20} grey={air} end={<span style={{ fontSize: 12, color: "#9CA3AF" }}>{air ? "وضع الطيران" : ""}</span>} />
    </Panel>
  );
  const more = (r: R, onState: number) => (
    <Panel r={r}>
      <div style={{ fontSize: 21, fontWeight: 800, textAlign: "center", marginBottom: 10 }}>المزيد</div>
      <Row label="التذكيرات" on={onState} />
    </Panel>
  );

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "rep" ? (
        <Panel r={ONE}>
          <Small text="Visual representation" muted />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, marginTop: 130, fontSize: 21 }}>
            <Toggle on={demo} w={110} />
            <span dir="ltr">{demo > 0.5 ? "ON State" : "OFF State"}</span>
          </div>
        </Panel>
      ) : null}

      {scene === "def" ? (
        <Panel r={ONE}>
          <Small text="Toggle switch: Digital on/off switch" muted />
          <div style={{ fontSize: 21, lineHeight: 1.6, margin: "6px 0 30px" }}>يغيّر حالة خاصية في النظام فورًا</div>
          <div dir="ltr" style={{ display: "flex", gap: 40, justifyContent: "center" }}>
            <Toggle on={0} w={84} />
            <Toggle on={1} w={84} />
          </div>
          {f >= B.replace ? (
            <div style={{ marginTop: 50, opacity: enter(f, B.replace, 12) }}>
              <Small text="قد يحلّ محل Radio buttons اثنين أو Checkbox واحد" />
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, fontSize: 21 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Marker kind="radio" on={1} size={18} />تشغيل</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Marker kind="radio" size={18} />إيقاف</span>
                <span style={{ color: "#9CA3AF" }}>←</span>
                <Toggle on={1} w={44} />
              </div>
            </div>
          ) : null}
        </Panel>
      ) : null}

      {scene === "air" ? (
        <>
          {flight(LEFT, 0, "nearL")}
          {flight(RIGHT, 1, "nearR")}
        </>
      ) : null}

      {scene === "imm" ? (
        <>
          {settings(LEFT, false)}
          {settings(RIGHT, true)}
        </>
      ) : null}

      {scene === "label" ? (
        <Panel r={ONE} head="سوق لين">
          <Q text="أين الخطأ؟" />
          <Row label="هل تريد تضمين المنتجات غير المخصّصة للحوامل؟" on={1} sel="longlabel" />
          <Small text="ترتيب حسب" muted />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["الأحدث", "الأعلى تقييمًا", "السعر"].map((t, i) => (<span key={t} style={{ height: 30, padding: "0 12px", borderRadius: 15, border: "1.5px solid #D5DAE1", display: "inline-flex", alignItems: "center", fontSize: 19, background: i === 1 ? "#FDE7C4" : "#FFFFFF" }}>{t}</span>))}
          </div>
        </Panel>
      ) : null}

      {scene === "fix" ? (
        <Panel r={ONE} head="موعد">
          <Small text="Labels قصيرة ومباشرة" muted />
          <Row label="إظهار رقم الأسبوع" on={0} fs={20} />
          <Row label="إظهار المواعيد المرفوضة" on={1} fs={20} />
        </Panel>
      ) : null}

      {scene === "state" ? (
        <Panel r={ONE}>
          <Q text="أين الخطأ؟" />
          <div style={{ fontSize: 22, fontWeight: 700 }}>عام</div>
          <div style={{ fontSize: 20, margin: "8px 0" }}>خيارات الخصوصية</div>
          <div style={{ fontSize: 20, lineHeight: 1.6, color: "#374151" }}>اسمح للتطبيقات باستخدام معرّف الإعلانات لعرض إعلانات تناسبك (إيقافه يعيد ضبط المعرّف)</div>
          <div dir="ltr" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 21 }}><span data-sel="offstate" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Toggle on={0} w={44} />Off</span></div>
        </Panel>
      ) : null}

      {scene === "sides" ? (
        <Panel r={ONE}>
          <Small text="اكتب Off و On على الجانبين" muted />
          <div dir="ltr" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 40, fontSize: 21, justifyContent: "center" }}>
            <span style={{ fontWeight: 700 }}>Off</span><Toggle on={0} w={70} /><span style={{ color: "#9CA3AF" }}>On</span>
          </div>
        </Panel>
      ) : null}

      {scene === "beside" ? (
        <>
          {more(LEFT, 0)}
          {more(RIGHT, 1)}
        </>
      ) : null}
    </div>
  );

  const overlay = (
    <>
      <CaseChip y={40} text="Toggle switch" p={span(f, B.rep, B.air)} />
      <SideNote w={360} y={110} text="Digital on/off switch" p={span(f, B.def, B.bulb)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="مثل مفتاح النور: يتغيّر الشيء لحظة الضغط" p={span(f, B.bulb, B.unlike)} />
      <SideNote w={360} y={110} text="بخلاف Checkbox و Radio: لا زر بعده" p={span(f, B.unlike, B.air)} icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="ينفّذ في النظام فورًا" p={span(f, B.now, B.air)} />
      <SideNote w={360} y={390} text="الفرق الأهم: التنفيذ اللحظي" p={span(f, B.diff, B.air)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="1 · أثر فوري" p={span(f, B.air, B.label)} />
      <SideNote w={360} y={110} text="يسار: Off · يمين: On" p={span(f, B.nearby, B.q)} icon={wi(IconEye)} />
      <SelectionOn target="nearL" hover={sel(B.tgl, B.wrong)} selected={0} />
      <SelectionOn target="nearR" hover={sel(B.tgl, B.wrong)} selected={sel(B.tgl, B.wrong)} label="المطارات القريبة" labelSide="below" />
      <SideNote w={360} y={110} text="صح أم خطأ؟ فكّر قبل أن تكمل" p={span(f, B.q, B.wrong)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="لا يحدث شيء لحظة الضغط" p={span(f, B.wrong, B.imm)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="هو Setting، مثل Checkbox" p={span(f, B.setting, B.imm)} warn />
      <SideNote w={360} y={390} text="أثره يظهر بعد البحث في صفحة النتائج" p={span(f, B.results, B.imm)} warn />
      <SideNote w={360} y={110} text="Toggle صحيح: أثره لحظي" p={span(f, B.imm, B.label)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="وضع الطيران يغيّر الشبكة فورًا" p={span(f, B.plane, B.label)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="2 · Label قصير ومباشر" p={span(f, B.label, B.state)} />
      <SelectionOn target="longlabel" labelSide="below" hover={sel(B.long, B.fix)} selected={sel(B.long, B.fix)} label="طويل وفيه نفي" />
      <SideNote w={360} y={110} text="الناس يقرؤون ما يحتاجونه فقط" p={span(f, B.reads, B.long)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="Label طويل وفيه نفي" p={span(f, B.long, B.fix)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="يحتاج وقتًا ليُقرأ ويُفهم" p={span(f, B.neg, B.fix)} warn />
      <SideNote w={360} y={110} text="Label قصير ومباشر يُفهم أسرع" p={span(f, B.fix, B.state)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="3 · حالة On و Off" p={span(f, B.state, END)} />
      <SelectionOn target="offstate" labelSide="below" hover={sel(B.which, B.sides)} selected={sel(B.which, B.sides)} label="Off؟" />
      <SideNote w={360} y={110} text="هل هو Off الآن، أم Off هو اسمه؟" p={span(f, B.which, B.sides)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="أضغط لأشغّله أم لأطفئه؟" p={span(f, B.which + 90, B.sides)} warn />
      <SideNote w={360} y={110} text="العنوان فوق؟ اكتب Off و On على الجانبين" p={span(f, B.sides, B.beside)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="أو Label بجانبه، واللون يدلّ على الحالة" p={span(f, B.beside, B.both)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="رمادي = Off، لون الـ Primary = On" p={span(f, B.color, B.both)} />
      <SideNote w={360} y={110} text="لا تكتب Off وحدها أو On وحدها" p={span(f, B.both, END)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="قد يُفهم أنها اسم الـ Toggle" p={span(f, B.single, END)} warn />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={address} illustrative overlay={overlay}>
        {product}
        <Verdict r={LEFT} good={false} p={scene === "air" ? span(f, B.wrong, B.imm) : 0} />
        <Verdict r={RIGHT} good={false} p={scene === "air" ? span(f, B.wrong, B.imm) : 0} />
        <Verdict r={LEFT} good p={scene === "imm" ? span(f, B.imm, B.label) : 0} />
        <Verdict r={RIGHT} good p={scene === "imm" ? span(f, B.imm, B.label) : 0} />
      </DebuggerShell>
      <Presenter cam="c12/cam.mp4" />
      <TitleBand title="Toggle switch" sub="Input controls" />
      <Voice src="c12/voice.m4a" />
      <IntroCard title="Toggle switch: أثره فوري" sub="Toggle switch" points={["الفرق عن Checkbox", "Label قصير", "حالة On و Off"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="Toggle switch واضح وفوري"
        items={[
          { text: "أثره لحظي، دون زر بعده" },
          { text: "لا يصلح لـ Setting يظهر أثره بعد البحث" },
          { text: "Label قصير ومباشر" },
          { text: "Off و On واضحان، أو Label ولون" },
        ]}
      />
    </AbsoluteFill>
  );
};
