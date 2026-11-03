import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, D } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconAlert, IconCheck, IconUser } from "../components/Icons";
import { span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, Mark, PhoneFrame, phoneRect, Presenter, RecapCard, Row, Screens, SideNote, Strike, Tap, TitleBand, v, Voice, wi } from "./p02";

/*
 * P02-C02 re-edit: heu 2 "match between the system and the real world", 160.4–276.2 s. A pharmacy app that sorts
 * medicines by disease, the designer's own logic, against the alphabetical order pharmacists actually search in.
 */
const VOICE = 115.8;
export const C02_FRAMES = clipFrames(VOICE);

const Group: React.FC<{ y: number; title: string; items: string[] }> = ({ y, title, items }) => (
  <>
    <div style={{ position: "absolute", left: 14, right: 14, top: y, fontSize: 15, fontWeight: 700, color: D.brand }}>{title}</div>
    {items.map((t, i) => (
      <div key={t} dir="ltr" style={{ position: "absolute", left: 14, right: 14, top: y + 26 + i * 30, fontSize: 15, color: C.text, textAlign: "right" }}>{t}</div>
    ))}
  </>
);
const ByDisease = () => (
  <>
    <Header title="رفيق · المخزون" />
    <Row y={72} text="ابحث عن دواء…" h={44} />
    <Group y={130} title="أدوية السكر" items={["Metformin 500", "Insulin glargine", "Gliclazide 80"]} />
    <Group y={256} title="أدوية الكبد" items={["Silymarin 140", "Ursodeoxycholic 250"]} />
    <Group y={352} title="أدوية الضغط" items={["Amlodipine 5", "Bisoprolol 5", "Valsartan 80"]} />
  </>
);
const Letter: React.FC<{ y: number; l: string; items: string[] }> = ({ y, l, items }) => (
  <>
    <div dir="ltr" style={{ position: "absolute", left: 14, top: y, fontSize: 16, fontWeight: 800, color: D.brand }}>{l}</div>
    {items.map((t, i) => (
      <div key={t} dir="ltr" style={{ position: "absolute", left: 44, right: 40, top: y + i * 28, fontSize: 15, color: C.text }}>{t}</div>
    ))}
  </>
);
const AtoZ = () => (
  <>
    <Header title="رفيق · المخزون" />
    <Row y={72} text="ابحث عن دواء…" h={44} />
    <Letter y={132} l="A" items={["Amlodipine 5", "Atorvastatin 20"]} />
    <Letter y={202} l="B" items={["Bisoprolol 5"]} />
    <Letter y={242} l="G" items={["Gliclazide 80"]} />
    <Letter y={282} l="I" items={["Insulin glargine"]} />
    <Letter y={322} l="M" items={["Metformin 500"]} />
    <Letter y={362} l="S" items={["Silymarin 140"]} />
    <Letter y={402} l="U" items={["Ursodeoxycholic 250"]} />
    <Letter y={442} l="V" items={["Valsartan 80"]} />
    <div dir="ltr" style={{ position: "absolute", right: 8, top: 132, width: 18, fontSize: 11, fontWeight: 700, color: D.brand, lineHeight: "17px", textAlign: "center", whiteSpace: "pre" }}>{"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").join("\n")}</div>
  </>
);

export const C02: React.FC = () => {
  const f = useCurrentFrame();
  const B = { app: 10, noResearch: 20, disease: 26, cats: 40, ship: 46, surprise: 54, abc: 60, assumed: 70, patient: 76, missed: 86, fail: 94, win: 108 };
  const END = VOICE;
  const mode: DebugMode = f < v(B.surprise) ? "live" : f < v(B.fail) ? "inspect" : "compare";
  const overlay = (
    <>
      <CaseChip y={40} text="نظام لسلسلة صيدليات" p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="الصيادلة يبحثون عن الدواء بسرعة" p={span(f, v(B.app), v(B.noResearch))} />
      <SideNote y={110} text="بلا بحث عن المستخدمين" p={span(f, v(B.noResearch), v(B.surprise))} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="افتراض المصمم: الأدوية حسب المرض" p={span(f, v(B.disease), v(B.surprise))} />
      <SideNote y={110} text="الصيدلي لم يعتد هذا الترتيب" p={span(f, v(B.surprise), v(B.abc))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="الصيدلي يبحث بالترتيب الأبجدي" p={span(f, v(B.abc), v(B.assumed))} big icon={wi(IconCheck)} />
      <SideNote y={110} text="تجربتك كمريض ليست تجربة الصيدلي" p={span(f, v(B.assumed), v(B.missed))} icon={wi(IconUser)} />
      <SideNote y={250} text="المريض يعرف الأقسام والأمراض" p={span(f, v(B.patient), v(B.missed))} />
      <SideNote y={110} text="فات التوافق مع العالم الحقيقي" p={span(f, v(B.missed), v(B.fail))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="طابِق النموذج الذهني للمستخدم (Mental model)" p={span(f, v(B.fail), v(END))} big icon={wi(IconCheck)} />
      <SideNote y={290} text="الأسهل لمن اعتاد الطريقة في حياته" p={span(f, v(B.win), v(END))} />
      <Strike r={phoneRect} p={f >= v(B.surprise) && f < v(B.abc) ? Math.min(1, (f - v(B.surprise)) / 20) : 0} />
      <Tap at={11} x={150} y={94} />
      <Mark r={L(14, 72, 272, 44)} from={11} to={20} label="البحث" />
      <Mark r={L(14, 126, 272, 120)} from={26.5} to={33} label="أدوية السكر" />
      <Mark r={L(14, 252, 272, 92)} from={33} to={40} label="أدوية الكبد" />
      <Mark r={L(10, 122, 280, 330)} from={40} to={B.surprise} label="Categories حسب المرض" side="below" />
      <Mark r={L(10, 128, 40, 340)} from={B.abc + 0.5} to={B.assumed} label="أبجدي" />
      <Mark r={L(270, 128, 26, 450)} from={B.abc + 3} to={B.assumed} label="A–Z" side="below" />
      <Mark r={L(10, 122, 280, 340)} from={B.patient} to={B.missed} label="منطق المريض" side="below" />
      <Mark r={L(10, 128, 286, 340)} from={B.fail + 1} to={END} label="منطق الصيدلي" side="below" />
    </>
  );
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="rafiq.app/stock" illustrative overlay={overlay}>
        <PhoneFrame>
          <Screens list={[{ at: 0, node: <ByDisease /> }, { at: B.abc, node: <AtoZ /> }, { at: B.assumed, node: <ByDisease /> }, { at: B.fail, node: <AtoZ /> }]} />
        </PhoneFrame>
      </DebuggerShell>
      <Presenter cam="c02/cam.mp4" />
      <TitleBand title="منطقك ليس منطق المستخدم" sub="Match between system and real world" />
      <Voice src="c02/voice.m4a" />
      <IntroCard title="رتّب كما يفكّر المستخدم" sub="Match between system and real world" points={["Mental model", "صيدلية"]} />
      <RecapCard
        voiceSec={VOICE}
        title="اعرف كيف يفكّر المستخدم قبل أن ترتّب"
        items={[
          { text: "ابحث عن طريقة المستخدم ومصطلحاته (Research)" },
          { text: "رتّب كما يرتّب في عمله وحياته" },
          { text: "الترتيب الذي يبدو منطقيًا لك أنت فقط", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
