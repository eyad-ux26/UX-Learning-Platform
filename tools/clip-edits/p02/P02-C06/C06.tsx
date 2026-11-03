import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, D } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconAlert, IconCheck, IconColumns, IconEye } from "../components/Icons";
import { span, tween } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, Mark, PhoneFrame, phoneRect, Pic, Presenter, RecapCard, Row, Screens, SideNote, Strike, TitleBand, Txt, v, Voice, wi } from "./p02";

/*
 * P02-C06 re-edit: heu 6 "recognition rather than recall", 224.5–369.5 s. Comparing phones page by page (recall),
 * a comparison table whose phone names scroll away (still recall), and a pricing table with fixed headers (recognition).
 */
const VOICE = 145.0;
export const C06_FRAMES = clipFrames(VOICE);

const PhonePage: React.FC<{ name: string; cam: string; bat: string; price: string }> = ({ name, cam, bat, price }) => (
  <>
    <Header title={name} back />
    <Pic y={74} h={170} tone="#E4EAFB" label="📱" />
    <Txt y={256} text={name} bold size={19} />
    <Row y={292} text={`الكاميرا: ${cam}`} h={44} />
    <Row y={344} text={`البطارية: ${bat}`} h={44} />
    <Row y={396} text={`السعر: ${price}`} h={44} />
  </>
);
const NAMES = ["نوفا 8", "زين X", "مدى 5"];
const ROWS: [string, string[]][] = [
  ["الشاشة", ["6.5\"", "6.1\"", "6.7\""]],
  ["الكاميرا", ["50MP", "48MP", "64MP"]],
  ["المعالج", ["8 أنوية", "6 أنوية", "8 أنوية"]],
  ["الوزن", ["190 جم", "172 جم", "201 جم"]],
  ["الشريحة", ["2", "1", "2"]],
  ["البطارية", ["5000", "4500", "4800"]],
  ["الشحن", ["33W", "25W", "45W"]],
  ["السعر", ["14,999", "18,500", "12,300"]],
];
const Table: React.FC<{ scroll: number; sticky?: boolean; names?: string[] }> = ({ scroll, sticky, names = NAMES }) => {
  const head = (
    <div style={{ display: "flex", height: 44, background: D.brandSoft, alignItems: "center", fontSize: 14, fontWeight: 700, color: D.brand }}>
      <div style={{ width: 72 }} />
      {names.map((n) => <div key={n} style={{ flex: 1, textAlign: "center" }}>{n}</div>)}
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 10, right: 10, top: 70, bottom: 10, overflow: "hidden", borderRadius: 12, border: `1px solid ${C.border}` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: -scroll }}>
        {head}
        {[...ROWS, ...ROWS.slice(0, 4)].map(([k, vals], i) => (
          <div key={i} style={{ display: "flex", height: 52, alignItems: "center", borderTop: `1px solid ${C.border}`, fontSize: 14, color: C.text }}>
            <div style={{ width: 72, paddingInlineStart: 10, fontWeight: 700, color: C.textMuted }}>{k}</div>
            {vals.map((x, j) => <div key={j} style={{ flex: 1, textAlign: "center" }}>{x}</div>)}
          </div>
        ))}
      </div>
      {sticky ? <div style={{ position: "absolute", left: 0, right: 0, top: 0, boxShadow: "0 4px 10px rgba(0,0,0,0.12)" }}>{head}</div> : null}
    </div>
  );
};

export const C06: React.FC = () => {
  const f = useCurrentFrame();
  const B = { phones: 10.9, ways: 18.9, recall: 28.9, second: 37.9, table: 43.9, look: 53.9, problem: 67.9, scroll: 73.9, battery: 83.9, updown: 93.9, plans: 101.9, scroll2: 111.9, fixed: 125.9, end: 141.9 };
  const END = VOICE;
  const mode: DebugMode = f < v(B.problem) ? "live" : f < v(B.plans) ? "inspect" : "compare";
  const s1 = tween(f, v(B.scroll), v(B.scroll + 4), 0, 320) + tween(f, v(B.updown), v(B.updown + 1.5), 0, -320) + tween(f, v(B.updown + 2), v(B.updown + 3.5), 0, 320);
  const s2 = tween(f, v(B.scroll2 + 2), v(B.scroll2 + 6), 0, 320);
  const overlay = (
    <>
      <CaseChip y={40} text={f < v(B.plans) ? "مقارنة هواتف" : "مقارنة باقات"} p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="المستخدم يريد أن يقارن بين أكثر من منتج" p={span(f, v(0.5), v(B.ways))} />
      <SideNote y={110} text="الحل 1: صفحة لكل هاتف" p={span(f, v(B.ways), v(B.second))} />
      <SideNote y={250} text="يتذكّر الأول وهو يرى الثاني (Recall)" p={span(f, v(B.recall), v(B.second))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="الحل 2: جدول مقارنة" p={span(f, v(B.second), v(B.problem))} icon={wi(IconColumns)} />
      <SideNote y={250} text="يرى المعلومة فيتعرّف عليها (Recognition)" p={span(f, v(B.look), v(B.problem))} icon={wi(IconEye)} />
      <SideNote y={110} text="لكن مع التمرير تختفي أسماء الهواتف" p={span(f, v(B.scroll), v(B.plans))} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="أيّ عمود لأيّ هاتف؟ يصعد وينزل" p={span(f, v(B.battery), v(B.plans))} warn />
      <SideNote y={110} text="العناوين ثابتة أثناء التمرير" p={span(f, v(B.fixed), v(END))} big icon={wi(IconCheck)} />
      <Strike r={phoneRect} p={f >= v(B.updown + 4) && f < v(B.plans) ? Math.min(1, (f - v(B.updown + 4)) / 20) : 0} />
      <Mark r={L(14, 292, 272, 44)} from={B.phones} to={B.ways} label="الكاميرا" />
      <Mark r={L(14, 344, 272, 44)} from={B.ways + 2} to={B.recall} label="البطارية" />
      <Mark r={L(14, 292, 272, 96)} from={B.recall + 0.5} to={B.second} label="ويتذكّر الأول" side="below" />
      <Mark r={L(10, 70, 280, 44)} from={B.table} to={B.look} label="أسماء الهواتف" side="below" />
      <Mark r={L(10, 114, 280, 104)} from={B.look} to={B.problem} label="يرى ويقارن" side="below" />
      <Mark r={L(10, 70, 280, 52)} from={B.battery} to={B.updown} label="أيّ عمود؟" side="below" />
      <Mark r={L(10, 70, 280, 44)} from={B.fixed} to={END} label="ثابت" side="below" />
    </>
  );
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={f < v(B.plans) ? "volt.app/compare" : "kalima.app/plans"} illustrative overlay={overlay}>
        <PhoneFrame>
          <Screens
            list={[
              { at: 0, node: <PhonePage name="نوفا 8" cam="50MP" bat="5000 mAh" price="14,999 جنيه" /> },
              { at: B.recall, node: <PhonePage name="زين X" cam="48MP" bat="4500 mAh" price="18,500 جنيه" /> },
              { at: B.second, node: <><Header title="قارن الهواتف" back /><Table scroll={s1} /></> },
              { at: B.plans, node: <><Header title="الباقات" back /><Table scroll={s2} sticky names={["أساسية", "قياسية", "مميزة"]} /></> },
            ]}
          />
        </PhoneFrame>
      </DebuggerShell>
      <Presenter cam="c06/cam.mp4" />
      <TitleBand title="أبقِ ما يقارن به الناس أمامهم" sub="Recognition rather than recall" />
      <Voice src="c06/voice.m4a" />
      <IntroCard title="لا تجعل الناس يتذكّرون ما يمكن أن يروه" sub="Recognition rather than recall" points={["Compare", "Sticky headers"]} />
      <RecapCard
        voiceSec={VOICE}
        title="التعرّف أسهل من التذكّر"
        items={[
          { text: "جدول مقارنة بدل التنقل بين الصفحات" },
          { text: "عناوين الأعمدة ثابتة أثناء التمرير" },
          { text: "جدول تختفي أسماؤه مع التمرير", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
