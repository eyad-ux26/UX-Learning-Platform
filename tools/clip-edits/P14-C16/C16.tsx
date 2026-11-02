import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye, IconTarget, IconUser } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, ListCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { LEFT, Panel, R, RIGHT, Small, Verdict } from "./ctl";
import { FBox, FButton, INK, MUTED, Row, Stepper, Wheel } from "./form";

/*
 * P14-C16: WP 7 "Input steppers" (34.91–295.53 s): benefits (no keyboard; a default from the most common value, as in
 * the slide's flight search with travellers; low interaction cost; clear + and − signifiers), drawbacks (the stacked
 * desktop arrows of a design tool's Size field, hard to hit; 1384 to 1500 takes 116 clicks), fixes (a text-field
 * stepper, long press, keyboard arrows on desktop) and guidelines (show the unit, disable + at the maximum, as with
 * 14 adults, and − at the minimum, as with 0 children).
 */
const VOICE = 260.62;
const vc = vCut("c16");
const VOICE_CUT = cutSec(VOICE, cutsOf("c16"));
export const C16_FRAMES = clipFrames(VOICE_CUT);

export const C16: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    kb: vc(8.3), tap: vc(11.7), dflt: vc(15.5), fly: vc(24.8), adults: vc(30.0), nums: vc(34.7), most: vc(37.0), two: vc(41.9), go: vc(51.0), once: vc(55.4), cost: vc(59.8),
    easy: vc(62.6), sig: vc(68.2), vs: vc(92.0), drop: vc(100.8), wheel: vc(103.6), low: vc(106.7),
    cons: vc(112.1), desk: vc(121.4), fitts: vc(128.6), hard: vc(143.5), big: vc(149.5), clicks: vc(159.3),
    fixes: vc(166.0), tfs: vc(176.7), typeIt: vc(185.5), hold: vc(191.5), half: vc(201.0), keys: vc(208.5),
    guide: vc(220.6), unit: vc(227.2), limits: vc(234.6), max: vc(246.7), min: vc(251.1),
  };
  const END = vc(VOICE) + 6;
  type Scene = "ben" | "dflt" | "easy" | "cons" | "fix" | "guide";
  const scene: Scene = f < B.dflt ? "ben" : f < B.easy ? "dflt" : f < B.cons ? "easy" : f < B.fixes ? "cons" : f < B.guide ? "fix" : "guide";
  const cuts = [B.dflt, B.easy, B.vs, B.cons, B.fixes, B.guide];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const mode: DebugMode = scene === "easy" && f >= B.vs ? "compare" : scene === "ben" ? "live" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);

  const T: R = { x: 440, y: 40, w: 530, h: 540 };
  const adults = scene === "ben" ? (f >= B.tap + 15 ? 2 : 1) : scene === "dflt" ? (f < B.two ? 1 : f < B.once + 20 ? 2 : 3) : 2;
  const press = (a: number) => (f >= a && f < a + 12 ? "plus" : undefined);

  // drawbacks: counting clicks from 1384 to 1500
  const clicks = f < B.clicks ? 0 : Math.min(116, Math.floor((f - B.clicks) / 2));
  // fixes: typed value, then a faster long press, then the keyboard arrow
  const typed = "1500".slice(0, Math.max(0, Math.floor((f - B.typeIt) / 6)));
  const held = f < B.hold + 20 ? 1 : 1 + Math.floor(((f - B.hold - 20) / 30) * (f < B.half ? 1 : 2) + (f >= B.half ? (B.half - B.hold - 20) / 30 : 0));

  const travellers = (n: number, o = 1) => (
    <div style={{ opacity: o }}>
      <Small text="المسافرون" />
      <Row label="البالغون" sub="18–64 سنة"><Stepper value={String(n)} press={scene === "dflt" ? press(B.once) : scene === "ben" ? press(B.tap) : undefined} minOff={n <= 1} /></Row>
      <Row label="كبار السن" sub="65+"><Stepper value="0" minOff /></Row>
      <Row label="الأطفال" sub="2–11 سنة"><Stepper value="0" minOff /></Row>
    </div>
  );

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "ben" || scene === "dflt" ? (
        <Panel r={T} head="جناح">
          <Small text="القاهرة ← دبي · 12 ديسمبر" muted />
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["اقتصادية", "مميزة", "رجال أعمال"].map((c, i) => (
              <span key={c} style={{ flex: 1, height: 42, borderRadius: 10, border: `1.5px solid ${i === 0 ? "#1D4ED8" : "#C4CAD3"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, color: i === 0 ? "#1D4ED8" : MUTED }}>{c}</span>
            ))}
          </div>
          {travellers(adults)}
          <FButton text="ابحث عن رحلات" />
        </Panel>
      ) : null}

      {scene === "easy" ? (
        f < B.vs ? (
          <Panel r={T} head="جناح">{travellers(2)}</Panel>
        ) : (
          <>
            <Panel r={LEFT} head="جناح" dim={span(f, B.low, B.cons) * 0.6}>
              <Small text="البالغون" />
              {f < B.wheel ? <FBox select value="2" /> : <Wheel cols={[["", "1", "2", "3", "4"]]} w={150} />}
            </Panel>
            <Panel r={RIGHT} head="جناح">
              <Small text="البالغون" />
              <Stepper value="2" w={230} press={press(B.low)} />
            </Panel>
          </>
        )
      ) : null}

      {scene === "cons" ? (
        <Panel r={{ x: 470, y: 90, w: 480, h: 340 }} dark>
          <div dir="ltr" style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>Design</div>
          <div dir="ltr" style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: "14px 16px", alignItems: "center", fontSize: 20 }}>
            <span style={{ color: "#BDBDBD" }}>Position</span>
            <span style={{ background: "#3A3A3A", borderRadius: 6, padding: "8px 10px" }}>X 138</span>
            <span style={{ background: "#3A3A3A", borderRadius: 6, padding: "8px 10px" }}>Y 170</span>
            <span style={{ color: "#BDBDBD" }}>Size</span>
            <span style={{ display: "flex", alignItems: "center", background: "#3A3A3A", borderRadius: 6, overflow: "hidden" }}>
              <span style={{ flex: 1, padding: "8px 10px" }}>W {f < B.clicks ? 1384 : 1384 + clicks}</span>
              <span style={{ width: 16, display: "flex", flexDirection: "column", fontSize: 8, color: "#BDBDBD", borderLeft: "1px solid #555" }}>
                <span style={{ textAlign: "center", background: f >= B.clicks && f % 4 < 2 ? "#5A5A5A" : undefined }}>▲</span>
                <span style={{ textAlign: "center" }}>▼</span>
              </span>
            </span>
            <span style={{ background: "#3A3A3A", borderRadius: 6, padding: "8px 10px" }}>H 786</span>
          </div>
          {f >= B.clicks ? <div dir="ltr" style={{ marginTop: 28, fontSize: 22, color: "#FFC970", fontWeight: 700 }}>{clicks} / 116 clicks</div> : null}
        </Panel>
      ) : null}

      {scene === "fix" ? (
        <Panel r={T} head="لوحة">
          <Small text="1 · Text-field stepper" muted />
          <Row label="العرض"><Stepper value={f < B.typeIt ? "1384" : typed || "|"} edit={f >= B.tfs} w={240} /></Row>
          <div style={{ opacity: enter(f, B.hold, 12) }}>
            <Small text="2 · ضغط مطوّل" muted />
            <Row label="النسخ"><Stepper value={String(held)} press={f >= B.hold ? "plus" : undefined} w={240} /></Row>
          </div>
          <div style={{ opacity: enter(f, B.keys, 12) }}>
            <Small text="3 · أسهم لوحة المفاتيح (Desktop)" muted />
            <div dir="ltr" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {["↑", "↓"].map((k, i) => (
                <span key={k} style={{ width: 54, height: 54, borderRadius: 10, border: "2px solid #C4CAD3", boxShadow: "0 3px 0 #C4CAD3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, background: i === 0 && f >= B.keys + 20 && f % 20 < 10 ? "#E3EAFD" : "#FFF", color: INK }}>{k}</span>
              ))}
              <span style={{ fontSize: 20, color: MUTED, marginLeft: 10 }}>= + / −</span>
            </div>
          </div>
        </Panel>
      ) : null}

      {scene === "guide" ? (
        <Panel r={T} head="جناح">
          <Small text="غرفة 1" />
          <Row label="البالغون" sub="حتى 14"><Stepper value={f >= B.max ? "14" : "13"} maxOff={f >= B.max} /></Row>
          <Row label="الأطفال" sub="2–11 سنة"><Stepper value="0" minOff /></Row>
          <div style={{ height: 1, background: "#E5E7EB", margin: "6px 0 16px" }} />
          <Row label="إكرامية السائق" sub="بخطوات 10 جنيه"><Stepper value="20 جنيه" w={230} /></Row>
        </Panel>
      ) : null}
    </div>
  );

  const overlay = (
    <>
      <CaseChip y={40} text="الفوائد" p={span(f, 0, B.cons)} />
      <SideNote w={360} y={110} text="لماذا Stepper أصلًا؟" p={span(f, 0, B.kb)} big icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="لا يحتاج لوحة مفاتيح" p={span(f, B.kb, B.dflt)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="أضغط + أو − حتى أصل للرقم" p={span(f, B.tap, B.dflt)} />
      <SideNote w={360} y={110} text="افهم القيمة الافتراضية (Default)" p={span(f, B.dflt, B.nums)} big icon={wi(IconUser)} />
      <SideNote w={360} y={110} text="يحجزون لشخص أو 2 أو 3 أو 4" p={span(f, B.nums, B.two)} icon={wi(IconUser)} />
      <SideNote w={360} y={250} text="ما الرقم الأكثر تكرارًا؟" p={span(f, B.most, B.two)} />
      <SideNote w={360} y={110} text="الأكثر تكرارًا 2؟ إذن الـ Default هو 2" p={span(f, B.two, B.go)} icon={wi(IconCheck)} />
      <Selection r={{ x: T.x + 20, y: T.y + 56 + 16 + 42 + 58 + 42, w: 490, h: 60 }} hover={sel(B.adults, B.easy)} selected={sel(B.two, B.easy)} label="Default = 2" labelSide="below" />
      <SideNote w={360} y={110} text="أغلبهم يكمل مباشرة…" p={span(f, B.go, B.once)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="…أو ضغطة أو اثنتان" p={span(f, B.once, B.easy)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="Interaction cost أقل" p={span(f, B.cost, B.easy)} big />
      <SideNote w={360} y={110} text="سهل الاستخدام" p={span(f, B.easy, B.sig)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="+ و− Signifiers واضحة للجميع" p={span(f, B.sig, B.vs)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="بدل Dropdown أو Scrolling picker…" p={span(f, B.vs, B.low)} icon={wi(IconEye)} />
      <Verdict r={LEFT} good={false} p={span(f, B.low, B.cons)} />
      <Verdict r={RIGHT} good p={span(f, B.low, B.cons)} />
      <SideNote w={360} y={110} text="Stepper: أسرع بكثير" p={span(f, B.low, B.cons)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="العيوب" p={span(f, B.cons, B.fixes)} warn />
      <SideNote w={360} y={110} text="على الـ Desktop: سهمان صغيران فوق بعض" p={span(f, B.desk, B.fitts)} warn icon={wi(IconAlert)} />
      <Selection r={{ x: 470 + 20 + 90 + 16 + 150, y: 90 + 16 + 20 + 18 + 30 + 14 + 28, w: 22, h: 34 }} hover={sel(B.desk, B.big)} selected={sel(B.fitts, B.big)} pad={4} label="هدف صغير" labelSide="below" />
      <SideNote w={360} y={110} text="Fitts's law: الهدف الأكبر أسرع وأسهل" p={span(f, B.fitts, B.big)} icon={wi(IconTarget)} />
      <SideNote w={360} y={250} text="هنا صغير، فيصعب الضغط عليه" p={span(f, B.hard, B.big)} warn />
      <SideNote w={360} y={110} text="تغيير كبير: من 1384 إلى 1500" p={span(f, B.big, B.fixes)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="116 ضغطة! غير عملي" p={span(f, B.clicks, B.fixes)} warn />

      <CaseChip y={40} text="الحلول" p={span(f, B.fixes, B.guide)} />
      <ListCard
        w={360}
        y={110}
        p={span(f, B.tfs, B.guide)}
        items={[
          { text: "اضغط الرقم واكتب أي رقم", p: enter(f, B.tfs, 10) },
          { text: "ضغط مطوّل يسرّع الزيادة", p: enter(f, B.hold, 10) },
          { text: "أسهم لوحة المفاتيح", p: enter(f, B.keys, 10) },
        ]}
      />

      <CaseChip y={40} text="إرشادات" p={span(f, B.guide, END)} />
      <SideNote w={360} y={110} text="وضّح ما يعبّر عنه الرقم: العملة، الوحدة" p={span(f, B.unit, B.limits)} icon={wi(IconEye)} />
      <Selection r={{ x: T.x + 20, y: T.y + 56 + 16 + 42 + 72 + 72 + 23, w: 490, h: 60 }} hover={sel(B.unit, B.limits)} selected={sel(B.unit + 30, B.limits)} label="جنيه" labelSide="below" />
      <SideNote w={360} y={110} text="وضّح الحد الأقصى والأدنى" p={span(f, B.limits, B.max)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="14 بالغًا = الحد الأقصى: + معطّل" p={span(f, B.max, END)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="0 أطفال = الحد الأدنى: − معطّل" p={span(f, B.min, END)} icon={wi(IconCheck)} />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={scene === "cons" || scene === "fix" ? "design.app/canvas" : "janah.travel/search"} illustrative overlay={overlay}>
        {product}
      </DebuggerShell>
      <Presenter cam="c16/cam.mp4" />
      <TitleBand title="الـ Steppers" sub="Input steppers" />
      <Voice src="c16/voice.m4a" />
      <IntroCard title="متى يكون الـ Stepper أسرع؟" sub="Input steppers" points={["Default ذكي", "العيوب وحلولها", "الوحدة والحدود"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="Stepper للتغييرات الصغيرة"
        items={[
          { text: "ابدأ من القيمة الأكثر تكرارًا" },
          { text: "للتغيير الكبير: اكتب الرقم، أو ضغط مطوّل" },
          { text: "أزرار كبيرة، وأسهم لوحة المفاتيح على الـ Desktop" },
          { text: "وضّح الوحدة، وعطّل + و− عند الحدود" },
        ]}
      />
    </AbsoluteFill>
  );
};
