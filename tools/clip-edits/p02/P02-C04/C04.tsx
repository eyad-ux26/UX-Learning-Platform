import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, D } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconAlert, IconCheck, IconColumns } from "../components/Icons";
import { span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, Mark, PhoneFrame, phoneRect, Presenter, RecapCard, Row, Screens, SideNote, Strike, Tap, TitleBand, Txt, v, Voice, wi } from "./p02";

/*
 * P02-C04 re-edit: heu 4 "consistency and standards", 992.3–1105.3 s. A multi-step listing form moves Next, Back and
 * Finish later between steps, so a habitual tap lands on Back; the fix keeps every button in one place on every step.
 */
const VOICE = 113.0;
export const C04_FRAMES = clipFrames(VOICE);

type B = "next" | "back" | "later";
const LABEL: Record<B, string> = { next: "التالي", back: "رجوع", later: "أكمل لاحقًا" };
const Step: React.FC<{ n: number; title: string; order: B[]; exit?: boolean }> = ({ n, title, order, exit }) => (
  <>
    <Header title="إقامة · أضف عقارك" />
    {exit ? <Txt y={70} text="✕ خروج" size={13} muted /> : null}
    <Txt y={92} text={`الخطوة ${n} من 3`} muted size={14} />
    <Txt y={116} text={title} bold size={20} />
    <Row y={158} text={n === 1 ? "نوع العقار: شقة" : "عدد الغرف: 2"} h={48} />
    <Row y={216} text={n === 1 ? "المدينة: الإسكندرية" : "عدد الضيوف: 4"} h={48} />
    <div dir="ltr" style={{ position: "absolute", left: 10, right: 10, top: 470, display: "flex", gap: 8, justifyContent: exit ? "flex-end" : "flex-start" }}>
      {order.map((b) => (
        <div key={b} style={{ width: 86, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, background: b === "next" ? D.brand : "#FFFFFF", color: b === "next" ? D.onBrand : C.text, border: b === "next" ? undefined : `2px solid ${C.border}` }}>{LABEL[b]}</div>
      ))}
    </div>
  </>
);

export const C04: React.FC = () => {
  const f = useCurrentFrame();
  const T = { use: 7.3, keep: 16.4, form: 22, step2: 35.8, incons: 44.7, oops: 54.1, fix: 67.1, exit: 80.7, reuse: 96.7 };
  const END = VOICE;
  const mode: DebugMode = f < v(T.incons) ? "live" : f < v(T.fix) ? "inspect" : "compare";
  const overlay = (
    <>
      <CaseChip y={40} text="نموذج من عدة خطوات" p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="Pattern: مجموعة Components تحلّ مشكلة واحدة" p={span(f, v(0.5), v(T.keep))} icon={wi(IconColumns)} />
      <SideNote y={110} text="لا تغيّر الـ Pattern بين الشاشات" p={span(f, v(T.keep), v(T.form))} big />
      <SideNote y={110} text="الخطوة 1: التالي أول زر من اليسار" p={span(f, v(T.form), v(T.step2))} />
      <SideNote y={110} text="الخطوة 2: رجوع مكان التالي" p={span(f, v(T.step2), v(T.oops))} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="عدم اتساق (Inconsistency) في الـ Pattern" p={span(f, v(T.incons), v(T.fix))} warn />
      <SideNote y={110} text="يضغط التالي بحكم العادة، فيرجع" p={span(f, v(T.oops), v(T.fix))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="كل زر في مكان ثابت في كل الخطوات" p={span(f, v(T.fix), v(END))} big icon={wi(IconCheck)} />
      <SideNote y={290} text="والخروج ثابت في الأعلى، بأولوية أقل" p={span(f, v(T.exit), v(END))} />
      <SideNote y={430} text="والـ Pattern نفسه في كل مكان يُستخدم فيه" p={span(f, v(T.reuse), v(END))} />
      <Strike r={phoneRect} p={f >= v(T.oops + 3) && f < v(T.fix) ? Math.min(1, (f - v(T.oops + 3)) / 20) : 0} />
      <Mark r={L(10, 470, 86, 48)} from={T.form + 2} to={T.step2} label="التالي" />
      <Mark r={L(10, 470, 86, 48)} from={T.step2 + 0.4} to={T.oops - 0.3} label="رجوع هنا الآن" />
      <Mark r={L(104, 470, 86, 48)} from={T.step2 + 2} to={T.oops - 0.3} label="التالي" side="below" />
      <Mark r={L(10, 470, 86, 48)} from={T.oops + 0.2} to={T.oops + 4} label="ضغط رجوع!" />
      <Mark r={L(204, 470, 86, 48)} from={T.fix + 1} to={T.exit} label="التالي ثابت" />
      <Mark r={L(14, 66, 80, 26)} from={T.exit} to={T.reuse} label="خروج" side="below" />
      <Tap at={T.fix + 4} x={247} y={494} />
      <Tap at={T.fix + 9} x={247} y={494} />
      <Tap at={T.oops} x={54} y={494} />
    </>
  );
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="iqama.app/host" illustrative overlay={overlay}>
        <PhoneFrame>
          <Screens
            list={[
              { at: 0, node: <Step n={1} title="عن عقارك" order={["next", "later"]} /> },
              { at: T.step2, node: <Step n={2} title="المساحة" order={["back", "next", "later"]} /> },
              { at: T.oops + 0.4, node: <Step n={1} title="عن عقارك" order={["next", "later"]} /> },
              { at: T.fix, node: <Step n={1} title="عن عقارك" order={["later", "next"]} exit /> },
              { at: T.fix + 6, node: <Step n={2} title="المساحة" order={["back", "later", "next"]} exit /> },
            ]}
          />
        </PhoneFrame>
      </DebuggerShell>
      <Presenter cam="c04/cam.mp4" />
      <TitleBand title="الأزرار في أماكنها في كل خطوة" sub="Consistency and standards" />
      <Voice src="c04/voice.m4a" />
      <IntroCard title="لا تغيّر مكان ما اعتاده الناس" sub="Consistency and standards" points={["Pattern", "Next / Back"]} />
      <RecapCard
        voiceSec={VOICE}
        title="Pattern واحد، بأماكن ثابتة"
        items={[
          { text: "التالي ورجوع في المكان نفسه في كل خطوة" },
          { text: "الـ Pattern نفسه في كل مكان يُستخدم فيه" },
          { text: "أزرار تتبادل أماكنها بين الخطوات", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
