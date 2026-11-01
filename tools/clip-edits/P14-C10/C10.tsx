import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye, IconUser } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { LEFT, Marker, ONE, Opt, Panel, Q, R, RIGHT, Small, WIDE } from "./ctl";

/*
 * P14-C10 re-edit: WP 4 "checkboxes and radio buttons" (0–258.85 s), rebuilt slide by slide from the source: when to use
 * each, the stand-alone checkbox, the mixed look (squares that select like radios, then allow many), the standard look,
 * the one-line layout where each radio could belong to the word before or after it, and positive wording.
 */
const VOICE = 258.86;
const vc = vCut("c10");
const VOICE_CUT = cutSec(VOICE, cutsOf("c10"));
export const C10_FRAMES = clipFrames(VOICE_CUT);

const WORDS = ["واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة"];

export const C10: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    radio: vc(9.4), excl: vc(19.8), burgers: vc(26.0), swap: vc(29.0), chk: vc(33.8), zero: vc(35.7), tops: vc(43.6), t1: vc(45.0), t2: vc(46.6), t3: vc(48.6), first: vc(53.8),
    single: vc(57.1), onoff: vc(61.7), tool: vc(65.7), tick: vc(69.8),
    two: vc(75.3), look: vc(78.8), tapA: vc(84.2), btn: vc(86.0), torn: vc(88.6), tapB: vc(95.5), mixed: vc(98.4),
    std: vc(104.0), why: vc(111.9), broke: vc(118.0), sq: vc(134.6), rd: vc(144.7),
    lay: vc(154.1), tight: vc(157.7), four: vc(160.6), back: vc(166.2), start: vc(168.1), end: vc(172.4), found: vc(177.8), prob: vc(187.2), stack: vc(194.6), side: vc(203.7),
    word: vc(216.9), neg: vc(220.3), pos: vc(228.8), why2: vc(233.0), conf: vc(237.0),
  };
  const END = vc(VOICE) + 6;
  type Scene = "rep" | "choose" | "single" | "look" | "std" | "layout" | "word";
  const scene: Scene = f < B.radio ? "rep" : f < B.single ? "choose" : f < B.two ? "single" : f < B.std ? "look" : f < B.lay ? "std" : f < B.word ? "layout" : "word";
  const cuts = [B.radio, B.single, B.two, B.std, B.lay, B.word];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const mode: DebugMode = f < B.radio ? "live" : scene === "choose" || (scene === "look" && f < B.std) ? "compare" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const on = (a: number) => (f >= a ? 1 : 0);
  const sub = (r: R, dx: number, dy: number, w: number, h: number): R => ({ x: r.x + dx, y: r.y + dy, w, h });

  // one-line radios: 7 items; the selection boxes sit on the two radios beside «أربعة»
  // equal gaps everywhere, so a radio sits as close to the word after it as to the word before it
  const ROW = sub(WIDE, 18, 100, 546, 44);
  const CELL = 78, RAD = 22, GAP = 6, WORD = 44;
  const right = ROW.x + ROW.w;
  const radioAt = (i: number): R => ({ x: right - i * CELL - RAD, y: ROW.y + 11, w: RAD, h: RAD });
  const wordAt = (i: number): R => ({ x: right - i * CELL - RAD - GAP - WORD, y: ROW.y + 4, w: WORD, h: 32 });

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "rep" ? (
        <Panel r={ONE}>
          <Small text="Visual representation" muted />
          <div dir="ltr" style={{ display: "flex", justifyContent: "center", gap: 70, marginTop: 120 }}>
            {[{ k: "check" as const, t: "Checkbox" }, { k: "radio" as const, t: "Radio button" }].map((m) => (
              <div key={m.t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, fontSize: 21 }}><Marker kind={m.k} on={1} size={72} />{m.t}</div>
            ))}
          </div>
        </Panel>
      ) : null}

      {scene === "choose" ? (
        <>
          <Panel r={LEFT} head="لقمة" dim={span(f, B.chk, B.single) * 0.7}>
            <Small text="Radio buttons" muted />
            <Small text="أي برجر تريد؟" />
            <Opt label="برجر لحم" kind="radio" on={f < B.swap ? 1 : 0} />
            <Opt label="برجر دجاج" kind="radio" on={on(B.swap)} />
            <Opt label="برجر نباتي" kind="radio" />
          </Panel>
          <Panel r={RIGHT} head="لقمة" dim={span(f, B.radio, B.chk) * 0.7}>
            <Small text="Checkboxes" muted />
            <Small text="ماذا تضيف إلى البرجر؟" />
            <Opt label="جبنة" kind="check" on={on(B.t1)} />
            <Opt label="طماطم" kind="check" on={on(B.t2)} />
            <Opt label="خس" kind="check" on={on(B.t3)} />
          </Panel>
        </>
      ) : null}

      {scene === "single" ? (
        <Panel r={{ x: 560, y: 120, w: 380, h: 250 }} dark>
          <div dir="ltr" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Constraints</div>
          <div dir="ltr" style={{ display: "flex", gap: 22, alignItems: "center", marginBottom: 26 }}>
            <div style={{ width: 74, height: 74, border: "1.5px solid #6B6B6B", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: "#BDBDBD" }}>+</div>
            <div style={{ fontSize: 21, color: "#DADADA", lineHeight: 2 }}>↔ Left<br />↕ Top</div>
          </div>
          <div dir="ltr" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 21 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid #BDBDBD", background: f >= B.tick ? "#0D99FF" : "transparent", borderColor: f >= B.tick ? "#0D99FF" : "#BDBDBD", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              {f >= B.tick ? <IconCheck color="#FFFFFF" size={14} stroke={3} /> : null}
            </span>
            Fix position when scrolling
          </div>
        </Panel>
      ) : null}

      {scene === "look" ? (
        <Panel r={ONE}>
          <Q text={f < B.tapA ? "هل هذه Checkboxes أم Radio buttons؟" : f < B.tapB ? "والآن؟" : "مفاجأة!"} />
          <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 30, paddingInlineStart: 10 }}>
            <Marker kind="squaredot" on={0} size={34} />
            <Marker kind="squaredot" on={on(B.tapA)} size={34} />
            <Marker kind="squaredot" on={on(B.tapB)} size={34} />
          </div>
        </Panel>
      ) : null}

      {scene === "std" ? (
        <Panel r={ONE}>
          <Small text="1. Standard visual representation" muted />
          <div style={{ fontSize: 19, lineHeight: 1.6, margin: "8px 0 26px" }}>{f < B.rd ? "Checkbox: مربع صغير، فيه علامة صح أو X عند الاختيار" : "Radio button: دائرة صغيرة، في داخلها دائرة مملوءة عند الاختيار"}</div>
          <div dir="ltr" style={{ display: "flex", gap: 30, paddingLeft: 20 }}>
            <Marker kind={f < B.rd ? "check" : "radio"} on={0} size={64} />
            <Marker kind={f < B.rd ? "check" : "radio"} on={1} size={64} />
          </div>
        </Panel>
      ) : null}

      {scene === "layout" ? (
        f < B.stack ? (
          <Panel r={WIDE}>
            <Q text="أين الخطأ؟" />
            <Small text="كم شطيرة تريد؟" />
            <div style={{ position: "absolute", left: ROW.x - WIDE.x, top: ROW.y - WIDE.y, width: ROW.w, height: ROW.h, display: "flex", alignItems: "center", gap: GAP }}>
              {WORDS.map((w, i) => (
                <React.Fragment key={w}>
                  <Marker kind="radio" on={i === 0 ? 1 : 0} size={RAD} />
                  <span style={{ width: WORD, textAlign: "center", fontSize: 20, flexShrink: 0 }}>{w}</span>
                </React.Fragment>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel r={WIDE}>
            <Small text="2. Lay out your lists vertically" muted />
            {["الخيار 1", "الخيار 2", "الخيار 3"].map((t, i) => (<Opt key={t} label={t} kind="radio" on={i === 0 ? 1 : 0} h={36} />))}
            <div style={{ display: "flex", gap: 48, marginTop: 18, opacity: enter(f, B.side, 12) }}>
              {["الخيار 1", "الخيار 2", "الخيار 3"].map((t, i) => (<Opt key={t} label={t} kind="radio" on={i === 0 ? 1 : 0} h={36} />))}
            </div>
          </Panel>
        )
      ) : null}

      {scene === "word" ? (
        <Panel r={ONE} head="لقمة">
          <Small text="المكوّنات" />
          {f < B.pos ? (
            <>
              <Opt label="بدون خس" kind="check" />
              <Opt label="بدون طماطم" kind="check" on={1} />
              <Opt label="بدون بصل" kind="check" on={1} />
              <Opt label="بدون مايونيز" kind="check" />
              <Opt label="بدون جبنة" kind="check" />
            </>
          ) : (
            <>
              <Opt label="خس" kind="check" on={1} />
              <Opt label="طماطم" kind="check" strike />
              <Opt label="بصل" kind="check" strike />
              <Opt label="مايونيز" kind="check" on={1} />
              <Opt label="جبنة" kind="check" on={1} />
            </>
          )}
        </Panel>
      ) : null}
    </div>
  );

  const overlay = (
    <>
      <CaseChip y={40} text="Checkbox و Radio button" p={span(f, 0, B.radio)} />

      <CaseChip y={40} text="متى نستخدم أيّهما؟" p={span(f, B.radio, B.single)} />
      <Selection r={sub(LEFT, 8, 56, 234, 170)} hover={sel(B.radio, B.chk)} selected={sel(B.burgers, B.chk)} label="نوع واحد فقط" />
      <SideNote w={360} y={110} text="Radio buttons: اختيار واحد فقط" p={span(f, B.radio, B.chk)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="Mutually exclusive: اختيار أحدها يلغي الآخر" p={span(f, B.excl, B.chk)} />
      <Selection r={sub(RIGHT, 8, 56, 234, 170)} hover={sel(B.chk, B.single)} selected={sel(B.tops, B.single)} label="أي عدد" />
      <SideNote w={360} y={110} text="Checkboxes: أكثر من اختيار، أو لا شيء" p={span(f, B.chk, B.single)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="يمكن إضافة الثلاثة معًا، أو لا شيء" p={span(f, B.tops, B.single)} />

      <CaseChip y={40} text="Stand-alone checkbox" p={span(f, B.single, B.two)} />
      <SideNote w={360} y={110} text="Checkbox واحد لتشغيل خاصية أو إيقافها" p={span(f, B.onoff, B.two)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="شائع في برامج الـ Desktop" p={span(f, B.tool, B.two)} />

      <CaseChip y={40} text="1 · الشكل المعتاد" p={span(f, B.two, B.lay)} />
      <SideNote w={360} y={110} text="مربعات تحت بعضها: تبدو Checkboxes" p={span(f, B.look, B.btn)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="بعد الاختيار: مربع داخله مربع، مثل Radio" p={span(f, B.btn, B.tapB)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="هل هو Checkbox أم Radio button؟" p={span(f, B.torn, B.tapB)} warn />
      <SideNote w={360} y={110} text="ثم يقبل أكثر من اختيار: إذن Checkbox" p={span(f, B.tapB, B.std)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="شكله خليط بين الاثنين فيحتار الناس" p={span(f, B.mixed, B.std)} warn />
      <SideNote w={360} y={110} text="Standard visual representation" p={span(f, B.std, B.why)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="الناس يعرفون الـ Pattern فلا يتعلمون جديدًا" p={span(f, B.why, B.sq)} icon={wi(IconUser)} />
      <SideNote w={360} y={250} text="شكل مختلف = لا يعرفونه، وتضيع الفائدة" p={span(f, B.broke, B.sq)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="Checkbox: مربع وفيه علامة" p={span(f, B.sq, B.rd)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="Radio: دائرة في داخلها دائرة" p={span(f, B.rd, B.lay)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="2 · ترتيب الاختيارات" p={span(f, B.lay, B.word)} />
      <Selection r={wordAt(3)} hover={sel(B.four, B.start)} selected={sel(B.four, B.back)} label="أربعة" />
      <Selection r={radioAt(3)} hover={sel(B.back - 30, B.start)} selected={0} pad={4} />
      <Selection r={radioAt(4)} hover={sel(B.back - 30, B.start)} selected={0} pad={4} />
      <SideNote w={360} y={110} text="أضغط الدائرة قبل «أربعة» أم بعدها؟" p={span(f, B.four, B.start)} warn icon={wi(IconAlert)} />
      <Selection r={radioAt(0)} hover={sel(B.start, B.end)} selected={sel(B.start, B.end)} pad={4} label="البداية" />
      <SideNote w={360} y={110} text="أرجع للبداية: الدائرة الأولى قبل «واحد»" p={span(f, B.start, B.end)} />
      <SideNote w={360} y={110} text="أو للنهاية: لا دائرة بعد «سبعة»" p={span(f, B.end, B.prob)} />
      <SideNote w={360} y={250} text="المسافات متساوية، فلا يظهر لمن الدائرة" p={span(f, B.prob, B.stack)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="الأفضل: اختيار في كل سطر" p={span(f, B.stack, B.word)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="في صف واحد؟ مسافة واضحة بين الاختيارات" p={span(f, B.side, B.word)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="3 · كلمات إيجابية" p={span(f, B.word, END)} />
      <SideNote w={360} y={110} text="كل الاختيارات بصيغة النفي: «بدون…»" p={span(f, B.neg, B.pos)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="Positive and active wording" p={span(f, B.pos, B.why2)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="اسم الاختيار يقول ما سيُضاف" p={span(f, B.why2, END)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="مع النفي: أعلّم لأضيف أم لأمنع؟" p={span(f, B.conf, END)} warn />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={scene === "single" ? "design.app/canvas" : "lokma.app/order"} illustrative overlay={overlay}>
        {product}
      </DebuggerShell>
      <Presenter cam="c10/cam.mp4" />
      <TitleBand title="Checkboxes و Radio buttons" sub="Input controls" />
      <Voice src="c10/voice.m4a" />
      <IntroCard title="متى Checkbox ومتى Radio؟" sub="Input controls" points={["الاختيار الواحد والمتعدد", "الشكل المعتاد", "الترتيب والكلمات"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="Checkboxes و Radio buttons بلا حيرة"
        items={[
          { text: "Radio لاختيار واحد، Checkbox لأي عدد" },
          { text: "الشكل المعتاد: مربع وعلامة، دائرة في داخلها دائرة" },
          { text: "اختيار في كل سطر، أو مسافات واضحة" },
          { text: "كلمات إيجابية لا نفي" },
        ]}
      />
    </AbsoluteFill>
  );
};
