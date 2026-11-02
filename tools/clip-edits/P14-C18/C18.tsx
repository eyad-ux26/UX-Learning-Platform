import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye, IconTarget } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, ListCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { Panel, R, Small } from "./ctl";
import { FBox, FButton, INK, MUTED, Month, Wheel } from "./form";

/*
 * P14-C18: WP 9 "Date input" (0–202.34 s): calendar pickers (near dates; a year dropdown to jump far), a date range
 * shown on two months, scrolling pickers (near dates and times, not far dates or many dates), split day/month/year
 * dropdowns (high interaction cost) and typing the date (easiest, when the field shows where each part goes and moves
 * on by itself).
 */
const VOICE = 202.34;
const vc = vCut("c18");
const VOICE_CUT = cutSec(VOICE, cutsOf("c18"));
export const C18_FRAMES = clipFrames(VOICE_CUT);

const DAYS = ["11 ديس", "12 ديس", "13 ديس", "14 ديس", "15 ديس", "16 ديس", "17 ديس", "18 ديس", "19 ديس"];
const HOURS = ["6", "7", "8", "9", "10", "11", "12"];
const MINS = ["00", "15", "30", "45", "00", "15"];

export const C18: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    many: vc(4.5), need: vc(7.4), cal: vc(16.5), month: vc(21.4), near: vc(26.5), year: vc(30.4), back: vc(37.6), easy: vc(41.7), common: vc(47.2),
    range: vc(55.2), two: vc(64.2), across: vc(70.7), clear: vc(80.9),
    scroll: vc(87.3), cols: vc(93.2), time: vc(98.5), far: vc(104.2), close: vc(109.4), hours: vc(114.6), notFar: vc(119.8), lots: vc(132.1), typeIt: vc(141.8),
    drop: vc(146.1), cost: vc(153.9), d1: vc(156.7), d2: vc(160.1), d3: vc(163.0), more: vc(165.3), notPref: vc(168.9),
    type: vc(174.0), where: vc(177.7), auto: vc(181.3), slash: vc(189.1), knows: vc(193.7), best: vc(196.0),
  };
  const END = vc(VOICE) + 6;
  type Scene = "intro" | "cal" | "range" | "scroll" | "drop" | "type";
  const scene: Scene = f < B.cal ? "intro" : f < B.range ? "cal" : f < B.scroll ? "range" : f < B.drop ? "scroll" : f < B.type ? "drop" : "type";
  const cuts = [B.cal, B.range, B.scroll, B.drop, B.type];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const mode: DebugMode = scene === "intro" ? "live" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const T: R = { x: 440, y: 40, w: 530, h: 540 };

  // calendar: pick the 15th; then the year list opens and jumps to 2028
  const pick = f >= B.near ? 15 : -1;
  const yearOpen = f >= B.back && f < B.easy + 30;
  const year = f >= B.easy + 30 ? 2028 : 2026;

  // scrolling picker: one row per 14 frames; for a far date it spins on and on
  const shift = scene !== "scroll" ? 0 : f < B.cols + 20 ? 0 : f < B.far ? Math.min(3, Math.floor((f - B.cols - 20) / 14)) : 3;
  const spin = scene === "scroll" && f >= B.far && f < B.close ? Math.floor((f - B.far) / 4) : 0;
  const dayCol = spin > 0 ? Array.from({ length: 5 }, (_, i) => `${((spin + i) % 28) + 1} ${["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"][Math.floor((spin + i) / 28) % 6]}`) : DAYS.slice(shift, shift + 5);
  const hourShift = f >= B.hours + 20 ? Math.min(2, Math.floor((f - B.hours - 20) / 16)) : 0;

  // dropdowns: month, then day, then year; every open is two more taps
  const open = scene !== "drop" ? -1 : f >= B.d1 && f < B.d2 - 10 ? 1 : f >= B.d2 && f < B.d3 - 6 ? 0 : f >= B.d3 && f < B.more ? 2 : -1;
  const taps = scene !== "drop" || f < B.d1 ? 0 : f < B.d2 ? 2 : f < B.d3 ? 4 : 6;
  const dd = [f >= B.d2 - 10 ? "15" : "يوم", f >= B.d1 + 40 ? "ديسمبر" : "شهر", f >= B.d3 + 40 ? "2026" : "سنة"];
  const lists: string[][] = [["13", "14", "15", "16", "17", "18"], ["أكتوبر", "نوفمبر", "ديسمبر", "يناير", "فبراير", "مارس"], ["2024", "2025", "2026", "2027", "2028"]];

  // typing: the field moves on by itself and draws the slashes
  const typed = "15122026".slice(0, Math.max(0, Math.floor((f - B.auto) / 10)));
  const shown = [typed.slice(0, 2), typed.slice(2, 4), typed.slice(4)];

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "intro" ? (
        <Panel r={T} head="إقامة">
          <Small text="احجز غرفتك" />
          <Small text="تاريخ الوصول" muted />
          <FBox value="" ph="اختر التاريخ" caret />
          <div style={{ height: 16 }} />
          <Small text="تاريخ المغادرة" muted />
          <FBox value="" ph="اختر التاريخ" />
          <div style={{ height: 30 }} />
          <FButton text="ابحث عن غرف" />
        </Panel>
      ) : null}

      {scene === "cal" ? (
        <Panel r={T} head="إقامة">
          <Small text="تاريخ الوصول" muted />
          <FBox value={pick > 0 ? `${pick} ديسمبر ${year}` : ""} ph="اختر التاريخ" focus />
          <div style={{ position: "relative", marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", opacity: enter(f, B.month - 10, 12) }}>
            <div dir="rtl" style={{ display: "flex", gap: 10, marginBottom: 10, opacity: enter(f, B.year, 12) }}>
              <span style={{ height: 40, padding: "0 14px", borderRadius: 10, border: "1.5px solid #C4CAD3", display: "flex", alignItems: "center", fontSize: 19, fontWeight: 600, color: INK }}>ديسمبر ▾</span>
              <span style={{ height: 40, padding: "0 14px", borderRadius: 10, border: `1.5px solid ${yearOpen ? "#7E22CE" : "#C4CAD3"}`, display: "flex", alignItems: "center", fontSize: 19, fontWeight: 600, color: INK }}>{year} ▾</span>
            </div>
            <Month title={f >= B.year ? "" : `ديسمبر ${year}`} start={2} days={31} pick={pick} today={2} cell={52} fs={20} />
            {yearOpen ? (
              <div style={{ position: "absolute", top: 54, left: 150, width: 100, background: "#FFF", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.22)", padding: "6px 0" }}>
                {["2024", "2025", "2026", "2027", "2028", "2029"].map((y) => (
                  <div key={y} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600, color: INK, background: y === "2028" && f >= B.easy ? "#F1E6FB" : undefined }}>{y}</div>
                ))}
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {scene === "range" ? (
        <Panel r={T} head="إقامة">
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <Small text="الوصول" muted />
              <FBox value={f >= B.across + 20 ? "28 ديسمبر" : ""} ph="—" focus={f < B.across + 20} />
            </div>
            <div style={{ flex: 1 }}>
              <Small text="المغادرة" muted />
              <FBox value={f >= B.across + 60 ? "3 يناير" : ""} ph="—" focus={f >= B.across + 20 && f < B.across + 60} />
            </div>
          </div>
          <div dir="ltr" style={{ display: "flex", gap: 14, justifyContent: "center", opacity: enter(f, B.two - 10, 12) }}>
            <Month title="December 2026" start={2} days={31} from={f >= B.across + 20 ? 28 : -1} to={f >= B.across + 60 ? 31 : f >= B.across + 20 ? 28 : -1} cell={34} fs={17} />
            <Month title="January 2027" start={5} days={31} from={f >= B.across + 60 ? 1 : -1} to={f >= B.across + 60 ? 3 : -1} cell={34} fs={17} />
          </div>
          <div style={{ height: 24 }} />
          <FButton text={f >= B.across + 60 ? "6 ليالٍ · ابحث" : "ابحث عن غرف"} />
        </Panel>
      ) : null}

      {scene === "scroll" ? (
        <Panel r={T} head="إقامة">
          <Small text="موعد الوصول" />
          <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <Wheel cols={f >= B.time ? [dayCol, HOURS.slice(hourShift, hourShift + 5), MINS.slice(0, 5)] : [dayCol]} w={f >= B.time ? 110 : 170} />
          </div>
          <div style={{ textAlign: "center", fontSize: 19, color: MUTED, marginTop: 16 }}>مرّر لأعلى أو لأسفل</div>
          <div style={{ height: 40 }} />
          <div style={{ opacity: enter(f, B.typeIt, 12) }}>
            <Small text="أو اكتب التاريخ" muted />
            <FBox value="" ph="يوم / شهر / سنة" caret={f >= B.typeIt} />
          </div>
        </Panel>
      ) : null}

      {scene === "drop" ? (
        <Panel r={T} head="إقامة">
          <Small text="تاريخ الوصول" muted />
          <div style={{ position: "relative", display: "flex", gap: 10 }}>
            {dd.map((v, i) => (
              <div key={i} style={{ flex: 1, position: "relative" }}>
                <FBox select value={v === "يوم" || v === "شهر" || v === "سنة" ? "" : v} ph={v} focus={open === i} />
                {open === i ? (
                  <div style={{ position: "absolute", top: 48, left: 0, right: 0, background: "#FFF", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.22)", padding: "6px 0", zIndex: 2 }}>
                    {lists[i].map((x) => (
                      <div key={x} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 600, color: INK, background: x === ["15", "ديسمبر", "2026"][i] ? "#F1E6FB" : undefined }}>{x}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div dir="rtl" style={{ marginTop: 290, fontSize: 22, fontWeight: 700, color: "#B45309", opacity: f >= B.d1 ? 1 : 0 }}>نقرات: {taps}</div>
        </Panel>
      ) : null}

      {scene === "type" ? (
        <Panel r={T} head="إقامة">
          <Small text="تاريخ الوصول" muted />
          <div dir="ltr" style={{ display: "flex", alignItems: "center", gap: 10, height: 64, border: "2px solid #7E22CE", borderRadius: 12, padding: "0 18px", fontSize: 28, fontWeight: 700, color: INK }}>
            {[["DD", 2], ["MM", 2], ["YYYY", 4]].map(([ph, n], i) => (
              <React.Fragment key={i}>
                {i > 0 ? <span style={{ color: shown[i].length || (i === 1 && typed.length >= 2) || (i === 2 && typed.length >= 4) ? INK : "#C4CAD3" }}>/</span> : null}
                <span style={{ minWidth: (n as number) * 20, color: shown[i] ? INK : "#9CA3AF", background: f >= B.auto && typed.length >= [0, 2, 4][i] && typed.length < [2, 4, 9][i] ? "#F1E6FB" : undefined, borderRadius: 6, padding: "0 4px" }}>{shown[i] || (ph as string)}</span>
              </React.Fragment>
            ))}
          </div>
          <div dir="ltr" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px", fontSize: 19, color: MUTED, marginTop: 8, opacity: enter(f, B.where, 12) }}>
            {[["يوم", 2], ["شهر", 2], ["سنة", 4]].map(([t, n], i) => (
              <React.Fragment key={i}>
                {i > 0 ? <span style={{ fontSize: 28, visibility: "hidden" }}>/</span> : null}
                <span style={{ minWidth: (n as number) * 20, padding: "0 4px", textAlign: "center" }}>{t}</span>
              </React.Fragment>
            ))}
          </div>
          <div style={{ height: 30 }} />
          <FButton text="ابحث عن غرف" />
        </Panel>
      ) : null}
    </div>
  );

  const overlay = (
    <>
      <SideNote w={360} y={110} text="إدخال التاريخ: أكثر من Pattern" p={span(f, 0, B.cal)} big icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="اختر حسب ما يحتاجه المستخدم" p={span(f, B.need, B.cal)} icon={wi(IconTarget)} />

      <CaseChip y={40} text="Calendar picker" p={span(f, B.cal, B.scroll)} />
      <SideNote w={360} y={110} text="شهر كامل أمامك، اختر اليوم" p={span(f, B.month, B.near)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="مناسب جدًا للتواريخ القريبة" p={span(f, B.near, B.year)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="Dropdown للسنة يسهّل الرجوع أو التقدّم سنوات" p={span(f, B.year, B.common)} icon={wi(IconCheck)} />
      <Selection r={{ x: 598, y: T.y + 56 + 16 + 30 + 42 + 16, w: 92, h: 44 }} hover={sel(B.year, B.back)} selected={sel(B.year + 20, B.back)} />
      <SideNote w={360} y={110} text="من أكثر الـ Patterns استخدامًا" p={span(f, B.common, B.range)} big icon={wi(IconCheck)} />

      <SideNote w={360} y={110} text="تختار Date range؟ الـ Calendar الأفضل" p={span(f, B.range, B.two)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="اعرض شهرين جنبًا إلى جنب" p={span(f, B.two, B.scroll)} icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="من آخر شهر إلى أول التالي، في نظرة واحدة" p={span(f, B.across, B.scroll)} icon={wi(IconCheck)} />
      <SideNote w={360} y={390} text="الـ Range محدّد بوضوح" p={span(f, B.clear, B.scroll)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="Scrolling picker" p={span(f, B.scroll, B.drop)} />
      <SideNote w={360} y={110} text="مرّر حتى تصل للتاريخ، ومعه الوقت" p={span(f, B.cols, B.far)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="تاريخ بعيد؟ تمرير طويل جدًا" p={span(f, B.far, B.close)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="مناسب لتاريخ قريب، وللساعة والدقيقة" p={span(f, B.close, B.notFar)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="لا يناسب الرجوع شهورًا: نطاقه صغير" p={span(f, B.notFar, B.lots)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="تواريخ كثيرة في مساحة صغيرة: بطيء" p={span(f, B.lots, B.drop)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="اسمح بكتابة التاريخ: أسرع" p={span(f, B.typeIt, B.drop)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="Dropdowns" p={span(f, B.drop, B.type)} warn />
      <SideNote w={360} y={110} text="Dropdown لليوم والشهر والسنة" p={span(f, B.drop, B.cost)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="Interaction cost أعلى" p={span(f, B.cost, B.type)} big warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="افتح، مرّر، اختر… ثلاث مرات لتاريخ واحد" p={span(f, B.d1, B.type)} warn />

      <CaseChip y={40} text="Typing" p={span(f, B.type, END)} />
      <ListCard
        w={360}
        y={110}
        title="اكتب التاريخ"
        p={span(f, B.type, END)}
        items={[
          { text: "وضّح مكان اليوم والشهر والسنة", p: enter(f, B.where, 10) },
          { text: "انتقل للجزء التالي تلقائيًا", p: enter(f, B.auto, 10) },
          { text: "أضف الشَّرطة (/) تلقائيًا", p: enter(f, B.slash, 10) },
          { text: "من أسهل طرق الإدخال", p: enter(f, B.best, 10) },
        ]}
      />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="iqama.travel/book" illustrative overlay={overlay}>
        {product}
      </DebuggerShell>
      <Presenter cam="c18/cam.mp4" />
      <TitleBand title="إدخال التاريخ" sub="Date input" />
      <Voice src="c18/voice.m4a" />
      <IntroCard title="أي طريقة لإدخال التاريخ؟" sub="Date input" points={["Calendar والـ Range", "Scrolling picker", "الكتابة أسهل"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="طابق إدخال التاريخ مع الحاجة"
        items={[
          { text: "Calendar للتواريخ القريبة، مع Dropdown للسنة" },
          { text: "Date range: شهران جنبًا إلى جنب" },
          { text: "Scrolling picker للقريب وللوقت فقط" },
          { text: "تجنّب Dropdowns اليوم والشهر والسنة، واسمح بالكتابة" },
        ]}
      />
    </AbsoluteFill>
  );
};
