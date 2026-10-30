import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT } from "../brand/theme";
import { cameraAt, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye, IconSearch, IconText, IconUser } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, ListCard, PH, PhoneFrame, phoneRect, Presenter, RecapCard, SideNote, TitleBand, v, Voice, wi } from "./p14";

/*
 * P14-C09 re-edit: WP 24 "filter categories and values" (90.95–458.72 s). A shoe store's filter panel shows what a
 * category and a value are, then each of the four rules: appropriate, predictable, free of jargon, prioritized.
 */
const VOICE = 367.77;
export const C09_FRAMES = clipFrames(VOICE);

type Sec = { t: string; vals: string[]; open: number; o?: number; bad?: boolean; info?: boolean; struck?: number[] };
const HEAD = 46;
const ROW = 44;
const TOP = 72;

const layout = (secs: Sec[]) => {
  let y = TOP;
  return secs.map((s) => {
    const o = s.o ?? 1;
    const head: Rect = L(14, y, PH.w - 28, HEAD);
    const body: Rect = L(14, y + HEAD, PH.w - 28, ROW * s.open);
    y += (HEAD + ROW * s.open + 8) * o;
    return { head, body };
  });
};

const Panel: React.FC<{ secs: Sec[]; strikeP?: number }> = ({ secs, strikeP = 0 }) => {
  const rs = layout(secs);
  return (
    <>
      {secs.map((s, i) => {
        const { head, body } = rs[i];
        const o = s.o ?? 1;
        if (o <= 0) return null;
        return (
          <div key={s.t} style={{ opacity: o }}>
            <div style={{ position: "absolute", left: head.x - PH.x, top: head.y - PH.y, width: head.w, height: head.h, borderBottom: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 17, fontWeight: 700, color: C.text, boxSizing: "border-box" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {s.t}
                {s.info ? <span style={{ width: 20, height: 20, borderRadius: 10, border: `1.5px solid ${C.textMuted}`, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>i</span> : null}
              </span>
              <span style={{ display: "inline-block", rotate: `${s.open * 180}deg`, color: C.textMuted }}>⌄</span>
            </div>
            {s.open > 0.02 ? (
              <div style={{ position: "absolute", left: body.x - PH.x, top: body.y - PH.y, width: body.w, height: body.h, overflow: "hidden", display: "flex", gap: 6, alignItems: "center" }}>
                {s.vals.map((val, k) => {
                  const st = s.struck?.includes(k);
                  return (
                    <span key={val} style={{ height: 32, padding: "0 10px", borderRadius: 16, border: `1.5px solid ${st && strikeP > 0 ? C.warning : C.border}`, display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", textDecoration: st && strikeP > 0.5 ? "line-through" : undefined, opacity: st ? 1 - strikeP * 0.5 : 1 }}>{val}</span>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
};

export const C09: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    open: v(0.5), defs: v(3.1), cat: v(6.8), val: v(11.7), price: v(15.3), ranges: v(19.5), colors: v(24.3), why: v(33.9),
    four: v(46.2), r1: v(56.7), r2: v(59.2), r3: v(59.9), r4: v(65.2),
    a: v(75.5), aNeed: v(90.3), aResearch: v(99.9), aNeeds: v(117.9),
    p: v(142.1), pLabel: v(147.6), pEx: v(164.0), pIgnore: v(175.8), pStyle: v(185.2), pClosed: v(204.6), pOpen: v(212.3),
    j: v(224.2), jDiff: v(231.1), jEx: v(247.1), jVals: v(252.2), jFix: v(264.2),
    o: v(277.2), oResearch: v(287.7), oEx: v(300.3), oFew: v(318.3), oNew: v(337.2), oTip: v(350.5), oEnd: v(363.5),
  };
  const END = v(VOICE) + 6;
  const tw = (a: number, b: number) => span(f, a, b, 12);

  type Scene = "def" | "four" | "a" | "p" | "j" | "o";
  const scene: Scene = f < B.four ? "def" : f < B.a ? "four" : f < B.p ? "a" : f < B.j ? "p" : f < B.o ? "j" : "o";
  const cuts = [B.a, B.p, B.j, B.o];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));

  let secs: Sec[] = [];
  let strikeP = 0;
  if (scene === "def" || scene === "four") {
    secs = [
      { t: "السعر", vals: ["أقل من 500", "500–1000", "+1000"], open: scene === "four" ? 1 : enter(f, B.price, 12) },
      { t: "اللون", vals: ["أسود", "أبيض", "أحمر", "أخضر"], open: scene === "four" ? 1 : enter(f, B.colors, 12) },
      { t: "المقاس", vals: ["40", "41", "42", "43"], open: 0 },
    ];
  } else if (scene === "a") {
    strikeP = enter(f, B.aNeed + 20, 14);
    secs = [
      { t: "المقاس", vals: ["40", "41", "42", "43"], open: 1 },
      { t: "اللون", vals: ["أسود", "أبيض", "أحمر"], open: 1 },
      { t: "المخزن", vals: ["مخزن 3", "مخزن 7", "مخزن 9"], open: 1, struck: [0, 1, 2] },
      { t: "السعر", vals: ["أقل من 500", "500–1000"], open: 0 },
    ];
  } else if (scene === "p") {
    const all = tw(B.pOpen + 20, END + 999);
    const fixed = enter(f, B.pClosed, 14);
    secs = [
      { t: fixed > 0.5 ? "النوع: رياضي، رسمي…" : "نوع المنتج", vals: ["رياضي", "رسمي", "كاجوال"], open: all, bad: fixed < 0.5 },
      { t: "الطراز", vals: ["بأربطة", "بدون أربطة"], open: Math.max(all, tw(B.pStyle, B.pClosed)) },
      { t: "السعر", vals: ["أقل من 500", "500–1000"], open: all },
    ];
  } else if (scene === "j") {
    const fix = enter(f, B.jFix + 40, 14);
    secs = [
      { t: fix > 0.5 ? "مستوى الدعم" : "السلوك", vals: fix > 0.5 ? ["دعم خفيف", "متوسط", "قوي"] : ["بنفسجي", "برتقالي", "أخضر"], open: enter(f, B.jVals - 20, 12) },
      { t: "المقاس", vals: ["40", "41"], open: 0 },
      { t: "السعر", vals: ["أقل من 500"], open: 0 },
    ];
  } else {
    const added = enter(f, B.oNew + 10, 14);
    secs = [
      { t: "مواد معاد تدويرها", vals: ["نعم"], open: 0, info: true, o: added },
      { t: "النوع", vals: ["رياضي", "رسمي", "كاجوال"], open: 1 },
      { t: "المقاس", vals: ["40", "41", "42", "43"], open: 1 },
      { t: "السعر", vals: ["أقل من 500", "500–1000"], open: 1 },
      { t: "اللون", vals: ["أسود", "أبيض"], open: 0 },
      { t: "نوع النعل", vals: ["مطاط"], open: 0 },
    ];
  }
  const rs = layout(secs);

  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [{ f: 0, ...overview }];
  const cam = cameraAt(f, shots);
  const mode: DebugMode = f < B.defs ? "live" : (f >= B.pOpen && f < B.j) || (f >= B.jFix + 40 && f < B.o) ? "compare" : "inspect";
  const dim = Math.max(span(f, B.aNeed, B.aResearch), span(f, B.pIgnore, B.pClosed), span(f, B.jVals, B.jFix + 40)) * 0.9;
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const r = (i: number, part: "head" | "body") => camRect(rs[i]?.[part] ?? phoneRect, cam);
  const top3: Rect = rs.length > 3 ? { x: rs[1].head.x, y: rs[1].head.y, w: rs[1].head.w, h: rs[3].body.y + rs[3].body.h - rs[1].head.y } : phoneRect;

  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      <SideNote y={110} text="أولًا: Category و Value" p={span(f, B.defs, B.four)} big />
      <Selection r={r(0, "head")} hover={sel(B.cat, B.four)} selected={sel(B.cat, B.val)} label="Filter category" />
      <SideNote y={250} text="Category: العنوان الرئيسي" p={span(f, B.cat, B.four)} icon={wi(IconText)} />
      <Selection r={r(0, "body")} hover={sel(B.ranges, B.colors)} selected={sel(B.ranges, B.colors)} label="Filter values" />
      <Selection r={r(1, "body")} hover={sel(B.colors + 10, B.why)} selected={sel(B.colors + 10, B.why)} label="Filter values" />
      <SideNote y={370} text="Values: الاختيارات تحته" p={span(f, B.val, B.four)} icon={wi(IconCheck)} />

      <ListCard
        y={110}
        p={span(f, B.four, B.a)}
        title="4 قواعد للـ Categories والـ Values"
        items={[
          { text: "Appropriate: مناسبة لما يحتاجه الناس", p: enter(f, B.r1) },
          { text: "Predictable: تتوقع ما تحتها", p: enter(f, B.r2) },
          { text: "Free of jargon: بلا مصطلحات صعبة", p: enter(f, B.r3 + 40) },
          { text: "Prioritized: الأهم أولًا", p: enter(f, B.r4) },
        ]}
      />

      <CaseChip y={40} text="1 · Appropriate" p={span(f, B.a, B.p)} />
      <SideNote y={110} text="ضع ما يحتاج الناس أن يفلتروا به" p={span(f, B.a, B.p)} icon={wi(IconCheck)} />
      <Selection r={r(2, "head")} hover={sel(B.aNeed, B.aResearch)} selected={sel(B.aNeed, B.aResearch)} label="لا يستخدمه أحد" />
      <SideNote y={250} text="Values لا يحتاجها الناس أبدًا" p={span(f, B.aNeed, B.aResearch)} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="اعرف ذلك من Detailed user research" p={span(f, B.aResearch, B.p)} icon={wi(IconSearch)} />
      <SideNote y={390} text="عن ماذا يبحثون؟ وما احتياجاتهم؟" p={span(f, B.aNeeds, B.p)} icon={wi(IconUser)} />

      <CaseChip y={40} text="2 · Predictable" p={span(f, B.p, B.j)} />
      <SideNote y={110} text="من اسم الـ Category يتوقع ما تحتها" p={span(f, B.pLabel, B.j)} icon={wi(IconEye)} />
      <Selection r={r(0, "head")} hover={sel(B.pIgnore, B.pClosed)} selected={sel(B.pIgnore, B.pClosed)} label="اسم عام جدًا" />
      <SideNote y={250} text="«نوع المنتج»: تجاهله أغلب الناس" p={span(f, B.pIgnore, B.pClosed)} warn icon={wi(IconAlert)} />
      <SideNote y={390} text="وذهبوا إلى «الطراز»: اسم مفهوم" p={span(f, B.pStyle, B.pClosed)} />
      <SideNote y={250} text="أهم ما يكون حين تكون الـ Categories مطويّة" p={span(f, B.pClosed, B.j)} />
      <SideNote y={390} text="أو افتحها كلها by default فتظهر الـ Values" p={span(f, B.pOpen, B.j)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="3 · Free of jargon" p={span(f, B.j, B.o)} />
      <SideNote y={110} text="قد يقرأ الكلمة ولا يفهم معناها" p={span(f, B.jDiff, B.o)} />
      <Selection r={r(0, "body")} hover={sel(B.jVals, B.jFix + 40)} selected={sel(B.jVals, B.jFix + 40)} label="ماذا تعني؟" />
      <SideNote y={250} text="ألوان تدل على ماذا بالضبط؟" p={span(f, B.jVals, B.jFix + 40)} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="كلمات يفهمها كل الناس" p={span(f, B.jFix + 40, B.o)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="4 · Prioritized" p={span(f, B.o, END)} />
      <SideNote y={110} text="رتّبها حسب استخدام الناس وأهميتها" p={span(f, B.o, B.oNew)} icon={wi(IconCheck)} />
      <SideNote y={250} text="واعرف الترتيب من الـ Research" p={span(f, B.oResearch, B.oFew)} icon={wi(IconSearch)} />
      <Selection r={camRect(top3, cam)} hover={sel(B.oFew, B.oNew)} selected={sel(B.oFew, B.oNew)} label="أول 2 أو 3" />
      <SideNote y={250} text="أغلب الناس يستخدم أول 2 أو 3 Filters" p={span(f, B.oFew, B.oNew)} big />
      <Selection r={r(0, "head")} hover={sel(B.oNew + 30, END)} selected={sel(B.oNew + 30, END)} label="جديد · في الأعلى" />
      <SideNote y={250} text="Filter جديد؟ ضعه في الأعلى ليلاحظه" p={span(f, B.oNew + 20, END)} />
      <SideNote y={390} text="مطويّ، وبجانبه Tooltip يشرح معناه" p={span(f, B.oTip, END)} />
    </>
  );

  const tip = span(f, B.oTip + 20, END);
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="khatwa.app/shoes" illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>
            <Header title="الفلاتر" />
            <Panel secs={secs} strikeP={strikeP} />
            {scene === "o" && tip > 0 ? (
              <div style={{ position: "absolute", top: TOP + HEAD + 4, right: 20, width: 200, borderRadius: 10, background: "#1F2328", color: "#FFFFFF", fontSize: 13, lineHeight: 1.5, padding: "8px 12px", opacity: tip }}>أحذية مصنوعة من مواد معاد تدويرها</div>
            ) : null}
          </PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c09/cam.mp4" />
      <TitleBand title="Filters يفهمها الناس" sub="Filter categories · values" />
      <Voice src="c09/voice.m4a" />
      <IntroCard title="أسماء Filters واضحة، والأهم أولًا" sub="Filters" points={["Category و Value", "4 قواعد"]} />
      <RecapCard
        voiceSec={VOICE}
        title="Filters يحتاجها الناس ويفهمونها"
        items={[
          { text: "Categories و Values يحتاجها الناس فعلًا" },
          { text: "اسم Category يُفهم منه ما تحته" },
          { text: "كلمات بسيطة بلا Jargon" },
          { text: "الأهم والأكثر استخدامًا في الأعلى" },
        ]}
      />
    </AbsoluteFill>
  );
};
