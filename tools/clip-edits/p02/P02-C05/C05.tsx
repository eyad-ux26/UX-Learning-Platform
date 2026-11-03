import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, D } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconAlert, IconCalendar, IconCheck } from "../components/Icons";
import { span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, Mark, PhoneFrame, phoneRect, Presenter, RecapCard, Screens, SideNote, Strike, Tap, TitleBand, Txt, v, Voice, wi } from "./p02";

/*
 * P02-C05 re-edit: heu 5 "error prevention", 351.9–471.3 s. A check-in calendar that greys out past days, so a slipped
 * tap on 14 instead of 21 does nothing; a calendar with every day open lets someone pick 10 July thinking it's August.
 */
const VOICE = 119.4;
export const C05_FRAMES = clipFrames(VOICE);

const CELL = 38;
const Month: React.FC<{ title: string; start: number; days: number; today?: number; dim: boolean; pick?: number }> = ({ title, start, days, today = 0, dim, pick }) => (
  <>
    <Txt y={78} text={title} bold size={19} />
    <div dir="rtl" style={{ position: "absolute", left: 14, right: 14, top: 114, display: "grid", gridTemplateColumns: `repeat(7, ${CELL}px)`, gap: 2, justifyContent: "center" }}>
      {["س", "ح", "ن", "ث", "ر", "خ", "ج"].map((d) => <div key={d} style={{ height: 26, textAlign: "center", fontSize: 13, color: C.textMuted, fontWeight: 700 }}>{d}</div>)}
      {Array.from({ length: start }).map((_, i) => <div key={`e${i}`} />)}
      {Array.from({ length: days }).map((_, i) => {
        const n = i + 1;
        const off = dim && n < today;
        const on = n === pick;
        return (
          <div key={n} style={{ height: CELL, borderRadius: CELL / 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: on ? 800 : 600, background: on ? D.brand : "transparent", color: on ? D.onBrand : off ? "#C3C8CF" : C.text, textDecoration: off ? "line-through" : undefined, border: n === today ? `2px solid ${D.brand}` : undefined, boxSizing: "border-box" }}>{n}</div>
        );
      })}
    </div>
  </>
);
const Picker: React.FC<{ dim: boolean; pick?: number; title?: string; today?: number }> = ({ dim, pick, title = "يوليو 2026 · اختر تاريخ الوصول", today = 18 }) => (
  <>
    <Header title="إقامة · الحجز" />
    <Month title={title} start={3} days={31} today={today} dim={dim} pick={pick} />
  </>
);
// grid position of a day (RTL: Saturday is the right-most column)
const dayXY = (n: number, start = 3) => {
  const i = start + n - 1;
  const col = i % 7, row = Math.floor(i / 7);
  const gridW = 7 * CELL + 12;
  const x0 = (300 - gridW) / 2;
  return { x: x0 + gridW - (col * (CELL + 2) + CELL / 2), y: 114 + 28 + row * (CELL + 2) + CELL / 2 };
};

export const C05: React.FC = () => {
  const f = useCurrentFrame();
  const B = { guide: 5, limits: 14.1, future: 20.3, noPast: 26.6, disabled: 33.5, example: 43, tap14: 55, noResp: 61, conscious: 68.2, august: 78.3, black: 86.4, mistake: 98.2, door: 110 };
  const END = VOICE;
  const mode: DebugMode = f < v(B.example) ? "live" : f < v(B.conscious) ? "inspect" : "compare";
  const p14 = dayXY(14), p10 = dayXY(10);
  const overlay = (
    <>
      <CaseChip y={40} text="تقويم حجز" p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="Helpful constraints: حدود تمنع الاختيار غير الواقعي" p={span(f, v(B.guide), v(B.future))} big />
      <SideNote y={110} text="الحجز دائمًا في المستقبل" p={span(f, v(B.future), v(B.example))} icon={wi(IconCalendar)} />
      <SideNote y={250} text="فلا تعرض الأيام الماضية للاختيار" p={span(f, v(B.noPast), v(B.example))} />
      <SideNote y={110} text="الأيام الماضية معطّلة (Disabled)" p={span(f, v(B.example), v(B.conscious))} icon={wi(IconCheck)} />
      <SideNote y={250} text="ضغط 14 بدل 21 بالخطأ؟ لا شيء يحدث" p={span(f, v(B.tap14), v(B.conscious))} />
      <SideNote y={110} text="ويمنع الـ Mistakes أيضًا" p={span(f, v(B.conscious), v(B.black))} />
      <SideNote y={250} text="يظن أن يوليو هو أغسطس" p={span(f, v(B.august), v(B.door))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="كل الأيام بالأسود: يختار 10 يوليو" p={span(f, v(B.black), v(B.door))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="حدِّد ما يمكن اختياره، فتمنع الزلّات والأخطاء" p={span(f, v(B.door), v(END))} big icon={wi(IconCheck)} />
      <Strike r={phoneRect} p={f >= v(B.mistake) && f < v(B.door) ? Math.min(1, (f - v(B.mistake)) / 20) : 0} />
      <Mark r={L(14, 140, 272, 124)} from={B.disabled + 0.5} to={B.example + 6} label="Disabled" side="below" />
      <Mark r={L(p14.x - 20, p14.y - 20, 40, 40)} from={B.tap14 + 0.3} to={B.noResp + 6} label="لا يستجيب" side="below" />
      <Mark r={L(14, 76, 272, 30)} from={B.august} to={B.black} label="يوليو، لا أغسطس" side="below" />
      <Mark r={L(p10.x - 20, p10.y - 20, 40, 40)} from={B.black + 6.5} to={B.door} label="10 يوليو" side="below" />
      <Tap at={B.tap14} x={p14.x} y={p14.y} />
      <Tap at={B.black + 6} x={p10.x} y={p10.y} />
    </>
  );
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="iqama.app/dates" illustrative overlay={overlay}>
        <PhoneFrame>
          <Screens
            list={[
              { at: 0, node: <Picker dim={false} /> },
              { at: B.disabled, node: <Picker dim /> },
              { at: B.conscious, node: <Picker dim={false} /> },
              { at: B.black + 6.3, node: <Picker dim={false} pick={10} /> },
              { at: B.door, node: <Picker dim /> },
            ]}
          />
        </PhoneFrame>
      </DebuggerShell>
      <Presenter cam="c05/cam.mp4" />
      <TitleBand title="عطّل ما لا يصح اختياره" sub="Error prevention" />
      <Voice src="c05/voice.m4a" />
      <IntroCard title="امنع الخطأ قبل أن يقع" sub="Error prevention" points={["Constraints", "Slips"]} />
      <RecapCard
        voiceSec={VOICE}
        title="حدود مفيدة تمنع الخطأ"
        items={[
          { text: "عطّل الأيام الماضية في تقويم الحجز" },
          { text: "الحدود تمنع الزلّات والأخطاء الواعية معًا" },
          { text: "كل الخيارات متاحة حتى غير الواقعية", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
