import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconAlert, IconCheck, IconClock, IconSearch } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";
import { CaseChip, clipFrames, IntroCard, L, loc, mid, PH, PhoneFrame, phoneRect, Presenter, RecapCard, SideNote, TitleBand, v, Voice, wi } from "./p14";

/*
 * P14-C07 re-edit: WP 23 "search suggestions" (252.4–638.45 s). A recipe app shows suggestions while typing; the clip
 * covers why they help, the rule that every suggestion must have results, and which part of a suggestion to highlight.
 */
const VOICE = 386.05;
export const C07_FRAMES = clipFrames(VOICE);

const searchRect = L(14, 14, PH.w - 28, 46);
const ROW = 46;
const listRect = (n: number): Rect => L(14, 66, PH.w - 28, ROW * n);
const rowRect = (i: number): Rect => L(14, 66 + ROW * i, PH.w - 28, ROW);

/** One suggestion row. `hl` splits the text: the part in bold is the highlighted one. */
const Row: React.FC<{ i: number; typed: string; rest: string; mode: "plain" | "rest" | "typed"; pre?: string; post?: string; o?: number }> = ({ i, typed, rest, mode, pre = "", post = "", o = 1 }) => {
  const b = (t: string, on: boolean) => <span style={{ fontWeight: on ? 800 : 400, color: C.text }}>{t}</span>;
  return (
    <div style={{ ...loc(rowRect(i)), display: "flex", alignItems: "center", gap: 10, padding: "0 12px", fontSize: 17, borderBottom: `1px solid ${C.border}`, opacity: o, background: "#FFFFFF" }}>
      <IconSearch color={C.textMuted} size={18} />
      <span>
        {b(pre, false)}
        {b(typed, mode === "typed")}
        {b(rest + post, mode === "rest")}
      </span>
    </div>
  );
};

export const C07: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    tap: v(7.6), drop: v(10.6), live: v(18.2), why: v(22.1), tips: v(28.0),
    first: v(34.7), pick: v(70.5), good: v(79.7), cost: v(88.9), few: v(97.2), typo: v(110.1), typoFix: v(120.4),
    g1: v(143.0), bad: v(146.0), designer: v(155.1), giveUp: v(167.1),
    g2: v(174.3), style: v(178.3), ex: v(190.5), q: v(204.6), think: v(224.0), cases: v(243.2),
    c1: v(254.1), c1Hl: v(315.3), c2: v(264.3), c2Case: v(347.2), c2Hl: v(368.1), wrap: v(376.2),
  };
  const END = v(VOICE) + 6;

  type Scene = "list" | "results" | "bad" | "style1" | "style2";
  const scene: Scene = f < B.pick ? "list" : f < B.g1 ? "results" : f < B.g2 ? "bad" : f < B.c1 + 40 ? "style1" : f < B.c2Case - 20 ? "style1" : "style2";
  const cuts = [B.pick, B.g1, B.g2, B.c2Case - 20];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const styleMode = scene === "style1" ? (f >= B.c1Hl - 20 ? "rest" : "plain") : scene === "style2" ? (f >= B.c2Hl - 20 ? "typed" : "plain") : "plain";

  const QUERY = scene === "style2" ? "فراخ" : scene === "bad" ? "شوربة" : "شوربة";
  const typed = QUERY.slice(0, Math.round(QUERY.length * Math.min(1, Math.max(0, (f - (B.tap + 6)) / 40))));
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [{ f: 0, ...overview }];
  const cam = cameraAt(f, shots);
  const mode: DebugMode = f < B.tap ? "live" : "inspect";
  const dim = Math.max(span(f, B.bad + 20, B.giveUp), span(f, B.c1Hl, B.c2), span(f, B.c2Hl, B.wrap)) * 0.9;

  const tap = (at: number, r: Rect) => {
    const p = camPoint(mid(r), cam);
    return { keys: [{ f: at - 16, x: p.x - 40, y: p.y + 120 }, { f: at, ...p, click: true }, { f: at + 16, ...p }] as Key[], from: at - 18, to: at + 24 };
  };
  const touches = [tap(B.tap, searchRect), tap(B.pick - 10, rowRect(0))];
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);

  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      <SideNote y={110} text="Search suggestions تظهر وهو يكتب" p={span(f, B.drop, B.first)} big icon={wi(IconSearch)} />
      <SideNote y={250} text="تساعد كثيرًا على الوصول إلى ما يريد" p={span(f, B.why, B.first)} />
      <Selection r={camRect(listRect(3), cam)} hover={sel(B.drop + 20, B.first)} selected={sel(B.drop + 20, B.first)} label="Suggestions" />

      <CaseChip y={40} text="لماذا تفيد؟" p={span(f, B.pick, B.g1)} />
      <SideNote y={110} text="اقتراح مناسب يعطيه نتائج جيدة" p={span(f, B.good, B.cost)} icon={wi(IconCheck)} />
      <SideNote y={110} text="Interaction cost أقل: بضعة حروف ثم اختيار" p={span(f, B.cost, B.typo)} icon={wi(IconClock)} />
      <SideNote y={110} text="ويتجنب الأخطاء الإملائية" p={span(f, B.typo, B.g1)} />

      <CaseChip y={40} text="Tip 1" p={span(f, B.g1, B.g2)} />
      <SideNote y={110} text="لكل Suggestion نتائج حقيقية" p={span(f, B.g1, B.g2)} big icon={wi(IconCheck)} />
      <Selection r={camRect(rowRect(0), cam)} hover={sel(B.bad + 30, B.giveUp)} selected={sel(B.bad + 30, B.giveUp)} label="لا نتائج" />
      <SideNote y={250} text="يختاره فلا يجد إلا القليل أو لا شيء" p={span(f, B.bad + 20, B.designer)} warn icon={wi(IconAlert)} />
      <SideNote y={390} text="لاحظت المشكلة؟ نبّه لإصلاحها" p={span(f, B.designer, B.giveUp)} />
      <SideNote y={390} text="وغالبًا لن يحاول مرة أخرى" p={span(f, B.giveUp, B.g2)} warn />

      <CaseChip y={40} text="Tip 2" p={span(f, B.g2, END)} />
      <SideNote y={110} text="ميّز بين ما كتبه وما اقترحه الموقع" p={span(f, B.style, B.cases)} big />
      <SideNote y={250} text="ما كتبه المستخدم مقابل التكملة المقترحة" p={span(f, B.ex, B.q)} />
      <SideNote y={250} text="أيهما نميّزه بـ Highlight؟" p={span(f, B.q, B.cases)} big />
      <SideNote y={110} text="الحالة 1: التكملة فقط بعد ما كتبه" p={span(f, B.cases, B.c2Case)} icon={wi(IconCheck)} />
      <SideNote y={250} text="كل الاقتراحات تبدأ بما كتبه" p={span(f, B.c1 + 30, B.c1Hl)} />
      <SideNote y={250} text="ميّز الجزء المقترح، فيراه أسرع" p={span(f, B.c1Hl, B.c2Case)} icon={wi(IconCheck)} />
      <SideNote y={110} text="الحالة 2: ما كتبه قد يكون في أي موضع" p={span(f, B.c2Case, B.wrap)} icon={wi(IconCheck)} />
      <SideNote y={250} text="في الأول أو الوسط أو الآخر" p={span(f, B.c2Case + 20, B.c2Hl)} />
      <SideNote y={250} text="ميّز ما كتبه، ليرى موضعه بسرعة" p={span(f, B.c2Hl, B.wrap)} icon={wi(IconCheck)} />
      <SideNote y={390} text="وهكذا يعمل البحث بفاعلية" p={span(f, B.wrap, END)} big />
      {touches.map((t, i) => (
        <UserTouch key={i} frame={f} keys={t.keys} from={t.from} to={t.to} />
      ))}
    </>
  );

  const searchBar = (
    <div style={{ ...loc(searchRect), borderRadius: 23, border: `2px solid ${D.brand}`, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", fontSize: 18, fontWeight: 600, color: C.text, background: "#FFFFFF" }}>
      <IconSearch color={C.textMuted} size={20} />
      {scene === "list" ? typed : QUERY}
    </div>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="tabkha.app/search" illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>
            {searchBar}
            {scene === "list" && f >= B.drop ? (
              <div style={{ opacity: enter(f, B.drop, 10) }}>
                {["عدس", "خضار", "فراخ"].map((r, i) => (
                  <Row key={r} i={i} typed={typed} rest={" " + r} mode="plain" />
                ))}
              </div>
            ) : null}
            {scene === "results" ? (
              <div style={{ position: "absolute", top: 76, left: 14, right: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.textMuted }}>24 وصفة لـ «شوربة عدس»</div>
                {["شوربة عدس بالليمون", "شوربة عدس بالخضار", "شوربة عدس أصفر"].map((t) => (
                  <div key={t} style={{ height: 78, borderRadius: 12, background: D.brandSoft, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 17, fontWeight: 700, color: C.text }}>{t}</div>
                ))}
              </div>
            ) : null}
            {scene === "bad" ? (
              <>
                <Row i={0} typed={"شوربة"} rest=" لسان عصفور" mode="plain" />
                <div style={{ position: "absolute", top: 130, left: 14, right: 14, textAlign: "center", opacity: enter(f, B.bad, 12) }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>لا توجد وصفات مطابقة</div>
                  <div style={{ fontSize: 14, color: C.textMuted, marginTop: 8 }}>0 نتيجة</div>
                </div>
              </>
            ) : null}
            {scene === "style1" ? (
              <>
                {["عدس", "خضار", "فراخ", "سمك"].map((r, i) => (
                  <Row key={r} i={i} typed="شوربة" rest={" " + r} mode={styleMode as "plain" | "rest"} />
                ))}
              </>
            ) : null}
            {scene === "style2" ? (
              <>
                <Row i={0} pre="صدور " typed="فراخ" rest="" post=" مشوية" mode={styleMode as "plain" | "typed"} />
                <Row i={1} pre="شوربة " typed="فراخ" rest="" post=" بالخضار" mode={styleMode as "plain" | "typed"} />
                <Row i={2} typed="فراخ" rest="" post=" بانيه" mode={styleMode as "plain" | "typed"} />
                <Row i={3} pre="أرز بال" typed="فراخ" rest="" mode={styleMode as "plain" | "typed"} />
              </>
            ) : null}
          </PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c07/cam.mp4" />
      <TitleBand title="اقتراحات تقود إلى نتائج" sub="Search suggestions" />
      <Voice src="c07/voice.m4a" />
      <IntroCard title="اقتراحات البحث التي تساعد فعلًا" sub="Search · Suggestions" points={["نتائج حقيقية", "Highlight"]} />
      <RecapCard
        voiceSec={VOICE}
        title="اقتراحات قليلة الجهد وصادقة"
        items={[
          { text: "لكل اقتراح نتائج جيدة" },
          { text: "ميّز بين ما كتبه المستخدم وما اقترحه الموقع" },
          { text: "إن امتدت الاقتراحات من كلامه: ميّز التكملة" },
          { text: "إن كان كلامه في أي موضع: ميّز ما كتبه" },
          { text: "اقتراح بلا نتائج", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
