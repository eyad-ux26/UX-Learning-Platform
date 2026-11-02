import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, ListCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { LEFT, Panel, R, RIGHT, Small, Verdict } from "./ctl";
import { FBox, FButton, INK, MUTED, Row, Slider, Stepper } from "./form";

/*
 * P14-C17: WP 8 "Sliders" (34.33–272.91 s; a silent pause at 67.0–71.2 s is cut): the two types (continuous, any
 * value; discrete, fixed steps), the slide's weight scale that moves by 0.1 (hard to land on 80.4), the guideline that
 * sliders fit when an approximate value is good enough (warm or cold colour on a photo, brightness, volume; for an
 * exact number use a stepper or typing), and the price range whose values sit under the slider where the finger covers
 * them (show them above, or let people drag from below the handle).
 */
const VOICE = 238.58;
const vc = vCut("c17");
const VOICE_CUT = cutSec(VOICE, cutsOf("c17"));
export const C17_FRAMES = clipFrames(VOICE_CUT);

export const C17: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    two: vc(0.1), cont: vc(5.0), hundred: vc(8.6), disc: vc(14.2), contDef: vc(23.4), discDef: vc(27.1),
    scale: vc(41.1), weight: vc(45.1), real: vc(52.1), what: vc(71.4), tenth: vc(74.9), range: vc(79.6), dflt: vc(84.8), slide: vc(88.4), exact: vc(94.8), notFor: vc(97.6),
    approx: vc(102.2), enough: vc(109.9), warm: vc(112.4), look: vc(126.5), stop: vc(129.3), bright: vc(132.5), vol: vc(136.9),
    num: vc(146.5), notBest: vc(149.5), step: vc(152.7), type: vc(154.5),
    cover: vc(162.0), price: vc(165.9), under: vc(169.5), move: vc(176.1), hide: vc(179.8),
    guide: vc(181.6), not100: vc(189.7), press: vc(195.1), above: vc(199.8), down: vc(206.4), free: vc(212.2), space: vc(214.6), below: vc(224.0), many: vc(228.8),
  };
  const END = vc(VOICE) + 6;
  type Scene = "types" | "scale" | "approx" | "exact" | "cover" | "guide";
  const scene: Scene = f < B.scale ? "types" : f < B.approx ? "scale" : f < B.num ? "approx" : f < B.cover ? "exact" : f < B.guide ? "cover" : "guide";
  const cuts = [B.scale, B.approx, B.num, B.cover, B.guide];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const mode: DebugMode = scene === "exact" ? "compare" : scene === "types" ? "live" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const T: R = { x: 440, y: 40, w: 530, h: 540 };
  const ease = (a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // types: brightness moves smoothly, the timer jumps in steps of 10 minutes
  const bright = scene === "types" ? (f < B.cont ? 0.5 : f < B.disc ? 0.5 + 0.35 * Math.sin(((f - B.cont) / 70) * Math.PI) : 0.5) : 0.5;
  const timer = f < vc(16.1) ? 0 : Math.min(4, 1 + Math.floor((f - vc(16.1)) / 22));
  const timerAt = timer / 6;

  // weight scale: the ruler moves by 0.1 kg; landing on 80.4 means overshooting back and forth
  const wPath = [80.0, 80.0, 80.9, 79.8, 80.6, 80.2, 80.5, 80.3, 80.4];
  const wT = f < B.slide ? 0 : Math.min(wPath.length - 1, (f - B.slide) / 22);
  const wi0 = Math.floor(wT), wFrac = wT - wi0;
  const weight = wi0 >= wPath.length - 1 ? wPath[wPath.length - 1] : wPath[wi0] + (wPath[wi0 + 1] - wPath[wi0]) * wFrac;
  const wShown = Math.round(weight * 10) / 10;

  // approx: warm or cold on a photo, then brightness
  const temp = scene === "approx" ? (f < B.warm ? 0.5 : f < B.stop ? 0.5 + 0.38 * Math.sin(((f - B.warm) / 90) * Math.PI) : 0.62) : 0.62;
  const lum = scene === "approx" && f >= B.bright ? ease(B.bright, B.bright + 50, 0.5, 0.72) : 0.5;

  // price range: the right thumb moves while the finger covers the number under it
  const hi = scene === "cover" ? ease(B.move, B.hide, 0.82, 0.6) : 0.6;
  const priceOf = (k: number) => `${Math.round((200 + k * 1800) / 50) * 50} ج`;
  const dy = scene === "guide" && f >= B.down ? ease(B.down, B.down + 20, 0, 74) : 0;

  const photo = (
    <div style={{ position: "relative", height: 210, borderRadius: 14, overflow: "hidden", marginBottom: 18, filter: `brightness(${0.75 + lum * 0.6})` }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #8EC5E8 0%, #CFE6F2 52%, #8DB06A 53%, #5F8A3E 100%)" }} />
      <div style={{ position: "absolute", left: 70, top: 40, width: 74, height: 74, borderRadius: 37, background: "#FFE08A" }} />
      <div style={{ position: "absolute", right: 0, bottom: 60, width: 260, height: 90, background: "#6E8F55", borderRadius: "120px 120px 0 0" }} />
      <div style={{ position: "absolute", inset: 0, background: temp > 0.5 ? "#FF9A3C" : "#3C8CFF", opacity: Math.abs(temp - 0.5) * 1.3, mixBlendMode: "overlay" }} />
    </div>
  );

  const ruler = (
    <div dir="ltr" style={{ position: "relative", height: 110, overflow: "hidden", background: "#1F2328", borderRadius: 12 }}>
      <div style={{ position: "absolute", left: 245 - (weight - 78) * 160, top: 0, height: 110 }}>
        {Array.from({ length: 51 }, (_, i) => {
          const val = 78 + i / 10, major = i % 10 === 0, half = i % 5 === 0;
          return (
            <React.Fragment key={i}>
              <span style={{ position: "absolute", left: i * 16, top: 0, width: 2, height: major ? 44 : half ? 32 : 20, background: "#E5E7EB" }} />
              {major ? <span style={{ position: "absolute", left: i * 16, top: 56, translate: "-50% 0", fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{Math.round(val)}</span> : null}
            </React.Fragment>
          );
        })}
      </div>
      <span style={{ position: "absolute", left: 243, top: 0, width: 4, height: 60, background: "#FB923C" }} />
    </div>
  );

  const priceFilter = (top: boolean, finger: boolean) => (
    <Panel r={T} head="سوق لين">
      <Small text="الفلاتر" />
      <Row label="الفئة"><FBox select value="ساعات" w={240} /></Row>
      <div style={{ fontSize: 21, fontWeight: 700, color: INK, margin: "14px 0 6px" }}>السعر</div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: top ? 6 : 0 }}>
        <Slider range={[0.15, hi]} w={420} bubble={top ? [priceOf(0.15), priceOf(hi)] : undefined} under={top ? undefined : [priceOf(0.15), priceOf(hi)]} finger={finger} fingerDy={dy} />
      </div>
      <div style={{ height: 120 }} />
      <FButton text="اعرض 48 منتجًا" />
    </Panel>
  );

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "types" ? (
        <Panel r={T} head="ضوء">
          <Small text="مصباح غرفة المعيشة" muted />
          <div style={{ fontSize: 21, fontWeight: 700, color: INK, margin: "8px 0 0" }}>1 · السطوع</div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Slider at={bright} w={430} bubble={[`${Math.round(bright * 100)}%`]} ends={["0", "100"]} />
          </div>
          <div style={{ opacity: enter(f, B.disc - 10, 12), marginTop: 24 }}>
            <div style={{ fontSize: 21, fontWeight: 700, color: INK }}>2 · مؤقت الإطفاء</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Slider at={timerAt} w={430} steps={7} bubble={[`${timer * 5} دقيقة`]} ends={["0", "30"]} />
            </div>
          </div>
        </Panel>
      ) : null}

      {scene === "scale" ? (
        <Panel r={T} head="خطوة">
          <Small text="سجّل وزنك اليوم" muted />
          <div dir="ltr" style={{ textAlign: "center", fontSize: 76, fontWeight: 800, color: INK, letterSpacing: 1, margin: "18px 0 4px" }}>
            {wShown.toFixed(1)} <span style={{ fontSize: 30, fontWeight: 600, color: MUTED }}>كجم</span>
          </div>
          <div style={{ textAlign: "center", fontSize: 19, color: MUTED, marginBottom: 22 }}>اسحب المسطرة يمينًا أو يسارًا</div>
          {ruler}
          <div style={{ height: 70 }} />
          <FButton text="حفظ" />
        </Panel>
      ) : null}

      {scene === "approx" ? (
        <Panel r={T} head="صُوَر">
          {photo}
          <Row label="الدفء">
            <Slider at={temp} w={300} tint={["#5AA9FF", "#FF9F45"]} ends={["بارد", "دافئ"]} />
          </Row>
          <div style={{ opacity: enter(f, B.bright - 10, 12) }}>
            <Row label="السطوع">
              <Slider at={lum} w={300} />
            </Row>
          </div>
        </Panel>
      ) : null}

      {scene === "exact" ? (
        <>
          <Panel r={LEFT} head="خطوة" dim={span(f, B.step, B.cover) * 0.55}>
            <Small text="الوزن" />
            <div dir="ltr" style={{ textAlign: "center", fontSize: 44, fontWeight: 800, color: INK, margin: "6px 0 14px" }}>80.4</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Slider at={0.51} w={230} finger />
            </div>
          </Panel>
          <Panel r={RIGHT} head="خطوة" o={enter(f, B.step - 10, 12)}>
            <Small text="Stepper" muted />
            <Stepper value="80.4 كجم" w={240} />
            <div style={{ height: 30 }} />
            <div style={{ opacity: enter(f, B.type, 12) }}>
              <Small text="أو اكتب الرقم" muted />
              <FBox value={"80.4".slice(0, Math.max(0, Math.floor((f - B.type - 10) / 6)))} ph="الوزن بالكيلو" caret={f >= B.type} ltr />
            </div>
          </Panel>
        </>
      ) : null}

      {scene === "cover" ? priceFilter(false, f >= B.move - 10) : null}
      {scene === "guide" ? priceFilter(f < B.below, f >= B.press) : null}
    </div>
  );

  const overlay = (
    <>
      <CaseChip y={40} text="الأنواع" p={span(f, 0, B.scale)} />
      <SideNote w={360} y={110} text="ما الفرق بين الـ Slider الأول والثاني؟" p={span(f, B.two, B.cont)} big icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="Continuous: أي قيمة بين الحد الأدنى والأقصى" p={span(f, B.cont, B.scale)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="Discrete: عدد محدد من الخطوات" p={span(f, B.disc, B.scale)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="أين الخطأ؟" p={span(f, B.scale, B.approx)} warn />
      <SideNote w={360} y={110} text="Slider يشبه الميزان الحقيقي" p={span(f, B.weight, B.what)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="يتحرك 0.1 كجم في كل خطوة" p={span(f, B.tenth, B.slide)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="والوزن قد يكون 60 أو 120" p={span(f, B.range, B.slide)} warn />
      <SideNote w={360} y={110} text="الوصول إلى 80.4 يحتاج سحبًا كثيرًا" p={span(f, B.slide, B.approx)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="القيمة الدقيقة ليست هدف الـ Slider" p={span(f, B.notFor, B.approx)} warn />
      <Selection r={{ x: T.x + 20, y: T.y + 56 + 16 + 30 + 18 + 96 + 4 + 46, w: 490, h: 110 }} hover={sel(B.tenth, B.approx)} selected={sel(B.slide, B.approx)} label="0.1 لكل خطوة" labelSide="below" />

      <CaseChip y={40} text="إرشادات" p={span(f, B.approx, END)} />
      <SideNote w={360} y={110} text="الـ Slider أفضل حين تكفي قيمة تقريبية" p={span(f, B.approx, B.warm)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="بارد أو دافئ: يهم الشكل لا الرقم" p={span(f, B.warm, B.bright)} icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="أتوقف حين يبدو مناسبًا" p={span(f, B.stop, B.bright)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="مثل السطوع، والصوت" p={span(f, B.bright, B.num)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="الصوت يكفي حين أسمع جيدًا" p={span(f, B.vol, B.num)} />

      <SideNote w={360} y={110} text="تحتاج رقمًا دقيقًا؟ الـ Slider ليس الأفضل" p={span(f, B.num, B.cover)} warn icon={wi(IconAlert)} />
      <Verdict r={LEFT} good={false} p={span(f, B.step, B.cover)} />
      <Verdict r={RIGHT} good p={span(f, B.type, B.cover)} />
      <SideNote w={360} y={250} text="استخدم Stepper، أو اكتب الرقم: غالبًا الأفضل" p={span(f, B.step, B.cover)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="أين الخطأ؟" p={span(f, B.cover, B.guide)} warn />
      <SideNote w={360} y={110} text="نطاق السعر (Range)" p={span(f, B.price, B.under)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="الأرقام تحت الـ Slider…" p={span(f, B.under, B.guide)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={250} text="…فيغطيها إصبعي وأنا أسحب" p={span(f, B.hide, B.guide)} warn />

      <ListCard
        w={360}
        y={110}
        title="ما الذي سيغطيه الإصبع؟"
        p={span(f, B.guide, END)}
        items={[
          { text: "اعرض القيمة فوق المقبض", p: enter(f, B.guide + 15, 10) },
          { text: "أو اسحب من تحت المقبض فلا تغطي يدك الشاشة", p: enter(f, B.down, 10) },
          { text: "المساحة ضيقة؟ الأرقام تحت مقبولة إن كانت واضحة", p: enter(f, B.below, 10) },
        ]}
      />
      <Selection r={{ x: T.x + 20, y: T.y + 56 + 16 + 30 + 18 + 56 + 33, w: 490, h: 196 }} hover={sel(B.down - 20, B.below)} selected={sel(B.down + 20, B.below)} label="الإصبع تحت المقبض" labelSide="left" />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={scene === "types" ? "daw.home/lights" : scene === "scale" || scene === "exact" ? "khatwa.app/weight" : scene === "approx" ? "suwar.app/edit" : "shop.store/filters"} illustrative overlay={overlay}>
        {product}
      </DebuggerShell>
      <Presenter cam="c17/cam.mp4" />
      <TitleBand title="الـ Sliders" sub="Sliders" />
      <Voice src="c17/voice.m4a" />
      <IntroCard title="متى يكفي الـ Slider؟" sub="Sliders" points={["Continuous والـ Discrete", "القيمة التقريبية", "إصبعك يغطي الرقم"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="Slider للقيمة التقريبية"
        items={[
          { text: "Continuous لأي قيمة، والـ Discrete لخطوات محددة" },
          { text: "يناسب ما يُحكم عليه بالعين أو الأذن: اللون، السطوع، الصوت" },
          { text: "للرقم الدقيق: Stepper أو اكتب الرقم" },
          { text: "اعرض القيمة حيث لا يغطيها الإصبع" },
        ]}
      />
    </AbsoluteFill>
  );
};
