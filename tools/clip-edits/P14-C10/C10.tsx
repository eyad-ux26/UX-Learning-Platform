import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camRect, camStyle, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, ListCard, PH, PhoneFrame, Presenter, RecapCard, SideNote, TitleBand, v, Voice, wi } from "./p14";
import { Group, Marker, Opt } from "./ctl";

/*
 * P14-C10 re-edit: WP 4 "checkboxes and radio buttons" (0–258.85 s). A burger order shows when to use each control,
 * then four rules: standard look, clear layout, positive wording. (Selectable area comes in the next clip.)
 */
const VOICE = 258.86;
export const C10_FRAMES = clipFrames(VOICE);

export const C10: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    radio: v(9.4), excl: v(19.8), burgers: v(26.0), swap: v(29.0), chk: v(33.8), tops: v(43.6), t1: v(45.0), t2: v(47.5), t3: v(49.5), r1end: v(53.8),
    single: v(57.1), onoff: v(61.7), tick: v(69.8),
    two: v(75.3), look: v(78.8), btn: v(86.0), mixed: v(94.4), std: v(104.0), why: v(111.9), broke: v(118.0), shapes: v(134.6), sq: v(136.4), rd: v(144.7),
    lay: v(154.1), tight: v(157.7), stack: v(200.8), side: v(203.7),
    word: v(216.9), neg: v(220.3), pos: v(228.8), why2: v(233.0), conf: v(241.0),
  };
  const END = v(VOICE) + 6;
  type Scene = "choose" | "single" | "look" | "layout" | "word";
  const scene: Scene = f < B.single ? "choose" : f < B.two ? "single" : f < B.lay ? "look" : f < B.word ? "layout" : "word";
  const cuts = [B.single, B.two, B.lay, B.word];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));

  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [{ f: 0, ...overview }];
  const cam = cameraAt(f, shots);
  const mode: DebugMode = f < B.radio ? "live" : scene === "look" && f >= B.std && f < B.broke ? "compare" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const r = (x: number, y: number, w: number, h: number) => camRect(L(x, y, w, h), cam);
  const dim = Math.max(span(f, B.btn, B.mixed), span(f, B.tight, B.stack), span(f, B.neg, B.pos)) * 0.5;

  const swapped = enter(f, B.swap, 6) > 0.5;
  const on = (a: number) => (f >= a ? 1 : 0);

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="lokma.app/order" illustrative overlay={
        <>
          <FocusDim r={camRect(L(0, 0, PH.w, PH.h), cam)} amount={dim} pad={8} />

          <SideNote y={110} text="Radio button: اختيار واحد فقط" p={span(f, B.radio, B.chk)} big icon={wi(IconCheck)} />
          <SideNote y={250} text="Mutually exclusive: اختيار أحدها يلغي الآخر" p={span(f, B.excl, B.chk)} />
          <Selection r={r(14, 66, 272, 150)} hover={sel(B.burgers, B.chk)} selected={sel(B.burgers, B.chk)} label="نوع واحد" />
          <SideNote y={110} text="Checkbox: أكثر من اختيار، أو لا شيء" p={span(f, B.chk, B.single)} big icon={wi(IconCheck)} />
          <Selection r={r(14, 232, 272, 150)} hover={sel(B.tops, B.single)} selected={sel(B.tops, B.single)} label="يمكن الثلاثة معًا" />
          <SideNote y={250} text="يمكن إضافة الجبن والطماطم والمخلل معًا" p={span(f, B.t3, B.single)} />

          <CaseChip y={40} text="Checkbox واحد" p={span(f, B.single, B.two)} />
          <SideNote y={110} text="Checkbox واحد = تشغيل أو إيقاف خاصية" p={span(f, B.onoff, B.two)} icon={wi(IconCheck)} />
          <SideNote y={250} text="شائع في الـ Desktop" p={span(f, B.onoff + 90, B.two)} />

          <CaseChip y={40} text="1 · Standard visual representation" p={span(f, B.two, B.lay)} />
          <SideNote y={110} text="الشكل يوحي بأنها Checkboxes" p={span(f, B.look, B.btn)} icon={wi(IconEye)} />
          <SideNote y={110} text="بعد الضغط صارت تشبه أزرارًا!" p={span(f, B.btn, B.mixed)} warn icon={wi(IconAlert)} />
          <SideNote y={110} text="اختيار أكثر من واحد؟ إذن Checkbox، لكن شكله مختلط" p={span(f, B.mixed, B.std)} warn />
          <ListCard
            y={110}
            p={span(f, B.std, B.lay)}
            title="استخدم الشكل المعتاد"
            items={[
              { text: "الناس يعرفونه فلا يتعلمون شيئًا جديدًا", p: enter(f, B.why) },
              { text: "شكل مختلف = لا يعرفونه، وضاعت الفائدة", p: enter(f, B.broke), no: true },
              { text: "Checkbox: مربع وفيه علامة", p: enter(f, B.sq) },
              { text: "Radio: دائرة وفي داخلها دائرة", p: enter(f, B.rd) },
            ]}
          />

          <CaseChip y={40} text="2 · Layout واضح" p={span(f, B.lay, B.word)} />
          <SideNote y={110} text="أيّ دائرة تخص أي رقم؟" p={span(f, B.tight, B.stack)} warn icon={wi(IconAlert)} />
          <SideNote y={250} text="لا مسافة تفصل الاختيارات عن بعضها" p={span(f, B.tight + 120, B.stack)} warn />
          <SideNote y={110} text="الأفضل: اختيار تحت اختيار" p={span(f, B.stack, B.side)} icon={wi(IconCheck)} />
          <SideNote y={110} text="إن اضطررت للصف الواحد: مسافات كافية" p={span(f, B.side, END)} icon={wi(IconCheck)} />

          <CaseChip y={40} text="3 · كلمات إيجابية وفعلية" p={span(f, B.word, END)} />
          <SideNote y={110} text="كل الخيارات مكتوبة بصيغة النفي" p={span(f, B.neg, B.pos)} warn icon={wi(IconAlert)} />
          <SideNote y={250} text="هل أضغط لأضيف الجبن، أم لأمنعها؟" p={span(f, B.conf, B.pos)} warn />
          <SideNote y={110} text="Positive and active wording: صيغة الإثبات" p={span(f, B.pos, END)} icon={wi(IconCheck)} />
          <SideNote y={250} text="يميّز المستخدم الاختيار بسهولة" p={span(f, B.why2, END)} />
        </>
      }>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>
            <Header title="اطلب برجر" />

            {scene === "choose" ? (
              <>
                <Group title="نوع البرجر" top={70}>
                  <Opt label="لحم" kind="radio" on={swapped ? 0 : 1} />
                  <Opt label="دجاج" kind="radio" on={swapped ? 1 : 0} />
                  <Opt label="نباتي" kind="radio" on={0} />
                </Group>
                <Group title="إضافات" top={236} o={enter(f, B.chk - 6, 12)}>
                  <Opt label="جبنة" kind="check" on={on(B.t1)} />
                  <Opt label="طماطم" kind="check" on={on(B.t2)} />
                  <Opt label="مخلل" kind="check" on={on(B.t3)} />
                </Group>
              </>
            ) : null}

            {scene === "single" ? (
              <Group title="إعدادات العرض" top={90}>
                <Opt label="تثبيت الشريط أثناء التمرير" kind="check" on={on(B.tick)} />
              </Group>
            ) : null}

            {scene === "look" ? (
              <LookScene f={f} B={B} />
            ) : null}

            {scene === "layout" ? (
              <Group title="كم شطيرة؟" top={90}>
                {f < B.stack ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, height: 44, fontSize: 17, color: C.text }}>
                    {[1, 2, 3, 4].map((n) => (<React.Fragment key={n}><Marker kind="radio" on={n === 1 ? 1 : 0} size={20} /><span>{n}</span></React.Fragment>))}
                  </div>
                ) : f < B.side ? (
                  <>
                    {[1, 2, 3, 4].map((n) => (<Opt key={n} label={String(n)} kind="radio" on={n === 1 ? 1 : 0} />))}
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 26, height: 44, fontSize: 17, color: C.text }}>
                    {[1, 2, 3, 4].map((n) => (<span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Marker kind="radio" on={n === 1 ? 1 : 0} size={20} /><span>{n}</span></span>))}
                  </div>
                )}
              </Group>
            ) : null}

            {scene === "word" ? (
              <Group title="إضافات" top={90}>
                {f < B.pos ? (
                  <>
                    <Opt label="بدون جبنة" kind="check" on={on(B.conf)} />
                    <Opt label="بدون طماطم" kind="check" />
                    <Opt label="بدون مخلل" kind="check" />
                  </>
                ) : (
                  <>
                    <Opt label="جبنة" kind="check" on={1} />
                    <Opt label="طماطم" kind="check" />
                    <Opt label="مخلل" kind="check" />
                  </>
                )}
              </Group>
            ) : null}
          </PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c10/cam.mp4" />
      <TitleBand title="Checkboxes و Radio buttons" sub="Input controls" />
      <Voice src="c10/voice.m4a" />
      <IntroCard title="متى Checkbox ومتى Radio؟" sub="Input controls" points={["الاختيار الواحد والمتعدد", "الشكل المعتاد", "الـ Layout والكلمات"]} />
      <RecapCard
        voiceSec={VOICE}
        title="Checkboxes و Radio buttons بلا حيرة"
        items={[
          { text: "Radio لاختيار واحد، Checkbox لعدّة اختيارات" },
          { text: "الشكل المعتاد: مربع وعلامة، أو دائرة بداخلها دائرة" },
          { text: "الاختيارات تحت بعضها، أو مسافات كافية" },
          { text: "كلمات إيجابية لا نفي" },
        ]}
      />
    </AbsoluteFill>
  );
};

type Bs = { btn: number; mixed: number; std: number; look: number; broke: number };
/** Rows that look like checkboxes, then like buttons once chosen: the mixed look the trainer warns about. */
const LookScene: React.FC<{ f: number; B: Bs }> = ({ f, B }) => {
  if (f < B.std) {
    const first = f >= B.btn;
    const second = f >= B.mixed;
    const pill = (txt: string, chosen: boolean) => (
      <div key={txt} style={{ height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, marginBottom: 8, background: chosen ? D.brand : "transparent", color: chosen ? D.onBrand : C.text, border: `2px solid ${chosen ? D.brand : C.border}` }}>{txt}</div>
    );
    return (
      <Group title="الحجم" top={90}>
        {f < B.btn ? ["صغير", "وسط", "كبير"].map((t) => <Opt key={t} label={t} kind="check" />) : [pill("صغير", first), pill("وسط", second), pill("كبير", false)]}
      </Group>
    );
  }
  const brokenOn = f >= B.broke;
  return (
    <>
      <Group title="Checkbox" top={80}>
        <Opt label="مربع + علامة" kind="check" on={1} />
        {brokenOn ? <Opt label="دائرة + علامة" kind="roundcheck" on={1} warn /> : null}
      </Group>
      <Group title="Radio" top={240}>
        <Opt label="دائرة + نقطة" kind="radio" on={1} />
      </Group>
    </>
  );
};
