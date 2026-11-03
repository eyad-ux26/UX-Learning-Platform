import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, D, PRODUCT_FONT } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconCheck, IconClock, IconTarget } from "../components/Icons";
import { enter, span } from "../lib/timeline";
import { CaseChip, clipFrames, IntroCard, Mark, Presenter, RecapCard, SideNote, TitleBand, v, Voice, wi } from "./p02";

/*
 * P02-C07 re-edit: heu 7 "flexibility and efficiency of use", 56.4–175.6 s. A design tool shows each tool's keyboard
 * shortcut on hover; one key press beats the mouse trip, experts get faster, and a full shortcut list is one click away.
 */
const VOICE = 119.2;
export const C07_FRAMES = clipFrames(VOICE);

const WIN = { x: 470, y: 26, w: 500, h: 560 };
const TOOLS = [
  { k: "V", name: "تحديد", g: "➤" },
  { k: "F", name: "إطار", g: "#" },
  { k: "R", name: "مستطيل", g: "▭" },
  { k: "O", name: "دائرة", g: "◯" },
  { k: "T", name: "نص", g: "T" },
  { k: "P", name: "قلم", g: "✎" },
];

export const C07: React.FC = () => {
  const f = useCurrentFrame();
  const B = { hover: 9.6, faster: 21.6, letters: 31.6, years: 41.6, provide: 49.6, expert: 63.6, more: 73.6, repeat: 83.6, reach: 93.6, figma: 101.6, docs: 111.6 };
  const END = VOICE;
  const mode: DebugMode = f < v(B.faster) ? "live" : f < v(B.repeat) ? "inspect" : "live";
  const tip = span(f, v(B.hover), v(B.faster)) + span(f, v(B.figma), v(B.docs));
  const key = span(f, v(B.faster + 3), v(B.years));
  const bars = enter(f, v(B.years), 14) * (1 - enter(f, v(B.repeat), 10));
  const list = enter(f, v(B.docs), 14);
  const overlay = (
    <>
      <CaseChip y={40} text="أداة تصميم" p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="في أدوات التصميم دائمًا Shortcuts" p={span(f, v(0.5), v(B.hover))} />
      <SideNote y={110} text="مرّر على الأداة: يظهر اختصارها" p={span(f, v(B.hover), v(B.faster))} />
      <SideNote y={110} text="لوحة المفاتيح أسرع من الفأرة" p={span(f, v(B.faster), v(B.years))} big icon={wi(IconClock)} />
      <SideNote y={110} text="الخبير يصبح أسرع بكثير" p={span(f, v(B.years), v(B.repeat))} />
      <SideNote y={250} text="الكفاءة (Efficiency) = السرعة" p={span(f, v(B.expert), v(B.repeat))} icon={wi(IconTarget)} />
      <SideNote y={110} text="للإجراءات المتكررة اختصارات" p={span(f, v(B.repeat), v(B.figma))} />
      <SideNote y={250} text="لا تظهر للمبتدئ، لكن سهلة الوصول لمن يريد أن يتعلّم" p={span(f, v(B.reach), v(END))} />
      <SideNote y={110} text="اختصار عند المرور، وقائمة كاملة بها" p={span(f, v(B.figma), v(END))} big icon={wi(IconCheck)} />
      <Mark r={{ x: WIN.x + 140, y: WIN.y + 64, w: 48, h: 44 }} from={B.hover} to={B.faster} label="Hover" side="below" />
      <Mark r={{ x: WIN.x + 375, y: WIN.y + 415, w: 94, h: 94 }} from={B.faster + 3} to={B.letters + 6} label="R" />
      <Mark r={{ x: WIN.x + 135, y: WIN.y + 155, w: 230, h: 160 }} from={B.faster + 4} to={B.letters} label="مستطيل" side="below" />
      <Mark r={{ x: WIN.x + 20, y: WIN.y + 404, w: WIN.w - 40, h: 44 }} from={B.provide} to={B.expert} label="شهر" />
      <Mark r={{ x: WIN.x + 20, y: WIN.y + 444, w: WIN.w - 40, h: 44 }} from={B.expert} to={B.repeat} label="خبير" />
      <Mark r={{ x: WIN.x + 140, y: WIN.y + 64, w: 48, h: 44 }} from={B.figma} to={B.docs} label="Hover" side="below" />
      <Mark r={{ x: WIN.x + 30, y: WIN.y + 300, w: WIN.w - 60, h: 230 }} from={B.docs + 1} to={END} label="كل الاختصارات" />
    </>
  );
  const t = (i: number) => ({ left: WIN.x + 20 + i * 60, top: WIN.y + 64 });
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="design.app/file" illustrative overlay={overlay}>
        <div dir="rtl" style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 16, background: "#F5F6F8", boxShadow: "0 18px 40px rgba(0,0,0,0.35)", overflow: "hidden", fontFamily: PRODUCT_FONT }}>
          <div style={{ height: 50, background: "#1F2328", color: "#FFFFFF", display: "flex", alignItems: "center", padding: "0 18px", fontSize: 18, fontWeight: 700 }}>لوحة · ملف بلا عنوان</div>
          <div style={{ position: "absolute", left: 140, top: 160, width: 220, height: 150, borderRadius: 10, border: `3px solid ${D.brand}`, background: "#FFFFFF", opacity: enter(f, v(B.faster + 4), 10) }} />
        </div>
        {TOOLS.map((x, i) => {
          const on = (i === 2 && (tip > 0 || key > 0));
          return (
            <div key={x.k} style={{ position: "absolute", ...t(i), width: 48, height: 44, borderRadius: 10, background: on ? D.brand : "#FFFFFF", color: on ? D.onBrand : C.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, border: `1px solid ${C.border}`, fontFamily: PRODUCT_FONT }}>{x.g}</div>
          );
        })}
        {tip > 0 ? (
          <div dir="rtl" style={{ position: "absolute", left: t(2).left - 20, top: t(2).top + 54, padding: "8px 14px", borderRadius: 10, background: "#1F2328", color: "#FFFFFF", fontSize: 17, fontWeight: 700, opacity: Math.min(1, tip), fontFamily: PRODUCT_FONT, display: "flex", gap: 12 }}>
            <span>مستطيل</span><span style={{ padding: "0 8px", borderRadius: 6, background: "#3A4048" }}>R</span>
          </div>
        ) : null}
        {key > 0 ? (
          <div style={{ position: "absolute", left: WIN.x + 380, top: WIN.y + 420, width: 84, height: 84, borderRadius: 18, background: "#FFFFFF", border: `3px solid ${D.brand}`, boxShadow: "0 6px 0 #C9CED6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 800, color: C.text, opacity: Math.min(1, key), scale: String(1 - 0.08 * Math.max(0, Math.sin((f - v(B.faster + 3)) / 4))) }}>R</div>
        ) : null}
        {bars > 0 ? (
          <div dir="rtl" style={{ position: "absolute", left: WIN.x + 30, top: WIN.y + 380, width: WIN.w - 60, opacity: bars, fontFamily: PRODUCT_FONT }}>
            {[{ t: "مصمم منذ شهر", w: 0.9, s: "12 ثانية" }, { t: "مصمم منذ 5 سنوات", w: 0.25, s: "3 ثوانٍ" }].map((b, i) => (
              <div key={b.t} style={{ marginTop: i ? 18 : 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{b.t} · {b.s}</div>
                <div style={{ height: 16, borderRadius: 8, background: "#E3E6EA", marginTop: 6 }}>
                  <div style={{ height: 16, borderRadius: 8, width: `${b.w * 100 * Math.min(1, bars)}%`, background: i ? D.brand : "#9AA1AB" }} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {list > 0 ? (
          <div dir="rtl" style={{ position: "absolute", left: WIN.x + 30, top: WIN.y + 300, width: WIN.w - 60, borderRadius: 14, background: "#1F2328", color: "#FFFFFF", padding: "14px 18px", boxSizing: "border-box", opacity: list, fontFamily: PRODUCT_FONT }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>كل الاختصارات</div>
            {TOOLS.map((x) => (
              <div key={x.k} style={{ display: "flex", justifyContent: "space-between", fontSize: 15, lineHeight: "30px" }}>
                <span>{x.name}</span><span style={{ padding: "0 8px", borderRadius: 6, background: "#3A4048" }}>{x.k}</span>
              </div>
            ))}
          </div>
        ) : null}
      </DebuggerShell>
      <Presenter cam="c07/cam.mp4" />
      <TitleBand title="اختصارات تسرّع الخبير" sub="Flexibility and efficiency of use" />
      <Voice src="c07/voice.m4a" />
      <IntroCard title="أسرع للخبير، دون أن تعيق المبتدئ" sub="Flexibility and efficiency of use" points={["Shortcuts", "Experts"]} />
      <RecapCard
        voiceSec={VOICE}
        title="اختصارات يجدها من يبحث عنها"
        items={[
          { text: "اعرض الاختصار بجانب الأداة عند المرور عليها" },
          { text: "قائمة كاملة بالاختصارات لمن يريد أن يتعلّم" },
          { text: "اختصارات مخفية لا يكتشفها أحد", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
