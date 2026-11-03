import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, D, PRODUCT_FONT } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconAlert, IconCheck, IconTarget } from "../components/Icons";
import { enter, span } from "../lib/timeline";
import { CaseChip, clipFrames, IntroCard, Mark, Presenter, RecapCard, SideNote, Strike, TitleBand, v, Voice, wi } from "./p02";

/*
 * P02-C08 re-edit: heu 8 "aesthetic and minimalist design", 194.9–340.3 s. A flight booking page full of colours,
 * tiles and offers (noise) against a calm search page where the destination box and one primary button lead (signal).
 */
const VOICE = 145.4;
export const C08_FRAMES = clipFrames(VOICE);

const WIN = { x: 470, y: 26, w: 500, h: 560 };
const Tile: React.FC<{ x: number; y: number; w: number; h: number; bg: string; text: string; color?: string }> = ({ x, y, w, h, bg, text, color = "#FFFFFF" }) => (
  <div dir="rtl" style={{ position: "absolute", left: x, top: y, width: w, height: h, background: bg, color, borderRadius: 6, padding: 8, boxSizing: "border-box", fontSize: 14, fontWeight: 700 }}>{text}</div>
);
const Busy = () => (
  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#5B8DB8,#2D4F73 60%,#C9A86A)" }}>
    <div style={{ height: 36, background: "#0D2A44", color: "#FFFFFF", fontSize: 13, display: "flex", alignItems: "center", gap: 14, padding: "0 12px" }}>
      {["الحجوزات", "معلومات السفر", "عروض", "الأميال", "تسجيل الدخول", "بحث"].map((t) => <span key={t}>{t}</span>)}
    </div>
    <Tile x={14} y={50} w={150} h={120} bg="#E3B23C" text="انضم إلى نادي الأميال" color="#1F2328" />
    <Tile x={172} y={50} w={170} h={230} bg="#2E6FB7" text="احجز رحلة · فندق · سيارة · رحلات بحرية" />
    <Tile x={350} y={50} w={136} h={110} bg="#173A5E" text="حالة الرحلة" />
    <Tile x={350} y={168} w={136} h={112} bg="#1F4FA8" text="تسجيل الوصول" />
    <Tile x={14} y={178} w={150} h={102} bg="#6B6F76" text="رحلاتي" />
    <Tile x={14} y={290} w={230} h={90} bg="#0D2A44" text="50,000 ميل مكافأة!" />
    <Tile x={252} y={290} w={234} h={90} bg="#8C2D2D" text="بطاقة جناح الجديدة" />
    <Tile x={14} y={390} w={472} h={60} bg="#C9A86A" text="عروض الصيف · خصم حتى 40%" color="#1F2328" />
    <div style={{ position: "absolute", left: 300, top: 460, fontSize: 70 }}>✈️</div>
  </div>
);
const Calm = ({ focus }: { focus: number }) => (
  <div dir="rtl" style={{ position: "absolute", inset: 0, background: "#FFFFFF" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 150, background: "linear-gradient(180deg,#E0EBF5,#FFFFFF)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 60, textAlign: "center", fontSize: 26, fontWeight: 700, color: C.text }}>إلى أين تسافر؟</div>
    <div style={{ position: "absolute", left: 40, right: 40, top: 130, borderRadius: 16, background: "#FFFFFF", boxShadow: `0 10px 26px rgba(15,76,129,${0.12 + 0.18 * focus})`, padding: 16, border: `2px solid ${focus > 0.5 ? D.brand : "#E3E6EA"}` }}>
      <div style={{ display: "flex", gap: 8, fontSize: 13, color: C.textMuted, marginBottom: 10 }}><span>ذهاب وعودة</span><span>· بالغ واحد ·</span><span>اقتصادية</span></div>
      <div style={{ height: 44, borderRadius: 10, background: "#F4F5F7", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 16, color: C.text }}>من: القاهرة</div>
      <div style={{ height: 44, borderRadius: 10, background: "#F4F5F7", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 16, color: C.textMuted, marginTop: 8 }}>إلى أين؟</div>
      <div style={{ height: 44, borderRadius: 10, background: "#F4F5F7", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 16, color: C.textMuted, marginTop: 8 }}>التاريخ</div>
    </div>
    <div style={{ position: "absolute", left: 170, right: 170, top: 400, height: 50, borderRadius: 25, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, boxShadow: "0 8px 18px rgba(15,76,129,0.35)" }}>استكشف</div>
  </div>
);

export const C08: React.FC = () => {
  const f = useCurrentFrame();
  const B = { site: 5.7, signal: 15.7, noise: 31.7, many: 43.7, matters: 53.7, feel: 63.7, compete: 73.7, better: 83.7, box: 93.7, explore: 103.7, calm: 117.7, focus: 125.7, task: 137.7 };
  const END = VOICE;
  const mode: DebugMode = f < v(B.signal) ? "live" : f < v(B.better) ? "inspect" : "compare";
  const busy = f < v(B.better);
  const overlay = (
    <>
      <CaseChip y={40} text={busy ? "موقع حجز طيران 1" : "موقع حجز طيران 2"} p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="Signal: ما يحتاجه المستخدم للمهمة" p={span(f, v(B.signal), v(B.many))} />
      <SideNote y={250} text="Noise: كل ما لا يهمّه الآن، حتى لو كان جميلًا" p={span(f, v(B.noise), v(B.many))} />
      <SideNote y={110} text="ألوان كثيرة، صور كثيرة، خيارات كثيرة" p={span(f, v(B.many), v(B.better))} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="المهم: إلى أين، ومتى، ثم ابحث" p={span(f, v(B.matters), v(B.better))} icon={wi(IconTarget)} />
      <SideNote y={390} text="كل هذا ينافس العناصر الأهم" p={span(f, v(B.compete), v(B.better))} warn />
      <SideNote y={110} text="التركيز على مربع الوجهة في المنتصف" p={span(f, v(B.box), v(B.calm))} />
      <SideNote y={250} text="زر واحد بارز باللون الأساسي (Primary)" p={span(f, v(B.explore), v(B.calm))} />
      <SideNote y={110} text="إحساس السفر موجود، لكن بهدوء" p={span(f, v(B.calm), v(END))} big icon={wi(IconCheck)} />
      <SideNote y={290} text="لا شيء يسحب التركيز عن المهمة" p={span(f, v(B.focus), v(END))} />
      <Strike r={{ x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h }} p={f >= v(B.compete) && f < v(B.better) ? Math.min(1, (f - v(B.compete)) / 20) : 0} />
      <Mark r={{ x: WIN.x + 14, y: WIN.y + 50, w: 150, h: 120 }} from={B.many} to={B.many + 3} label="عرض" />
      <Mark r={{ x: WIN.x + 14, y: WIN.y + 290, w: 472, h: 90 }} from={B.many + 3} to={B.many + 6} label="عروض" />
      <Mark r={{ x: WIN.x + 14, y: WIN.y + 390, w: 472, h: 60 }} from={B.many + 6} to={B.matters} label="خصومات" />
      <Mark r={{ x: WIN.x + 172, y: WIN.y + 50, w: 170, h: 230 }} from={B.matters} to={B.compete} label="المهمة الأساسية" side="below" />
      <Mark r={{ x: WIN.x + 40, y: WIN.y + 130, w: 420, h: 222 }} from={B.box} to={B.explore} label="الوجهة والتاريخ" side="below" />
      <Mark r={{ x: WIN.x + 170, y: WIN.y + 400, w: 160, h: 50 }} from={B.explore} to={B.calm} label="Primary" side="below" />
      <Mark r={{ x: WIN.x + 40, y: WIN.y + 130, w: 420, h: 222 }} from={B.task} to={END} label="التركيز" side="below" />
    </>
  );
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={busy ? "janah.app/home" : "tazkara.app/flights"} illustrative overlay={overlay}>
        <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 16, overflow: "hidden", boxShadow: "0 18px 40px rgba(0,0,0,0.35)", fontFamily: PRODUCT_FONT }}>
          {busy ? <Busy /> : <div style={{ opacity: enter(f, v(B.better), 12) }}><Calm focus={enter(f, v(B.box), 14)} /></div>}
        </div>
      </DebuggerShell>
      <Presenter cam="c08/cam.mp4" />
      <TitleBand title="قلّل الضجيج، وارفع الإشارة" sub="Aesthetic and minimalist design" />
      <Voice src="c08/voice.m4a" />
      <IntroCard title="كل شيء زائد ينافس ما يهمّ" sub="Aesthetic and minimalist design" points={["Signal", "Noise"]} />
      <RecapCard
        voiceSec={VOICE}
        title="جمال هادئ يخدم المهمة"
        items={[
          { text: "أبرِز ما يحتاجه المستخدم للمهمة الآن" },
          { text: "لون أساسي واحد للإجراء الأهم" },
          { text: "صور وألوان وعروض تنافس المهمة", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
