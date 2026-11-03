import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, D } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconAlert, IconCheck, IconComment } from "../components/Icons";
import { span } from "../lib/timeline";
import { CaseChip, clipFrames, Mark, Field, Header, IntroCard, L, PhoneFrame, phoneRect, Presenter, RecapCard, Screens, SideNote, Strike, Tap, TitleBand, Txt, v, Voice, wi } from "./p02";

/*
 * P02-C01 re-edit: heu 1 "visibility of system status", 606.9–698.2 s. Setting a new password shows a loader, then
 * nothing: no word on whether the passwords match or the account is stopped. The fix names the reason and the next step.
 */
const VOICE = 91.3;
export const C01_FRAMES = clipFrames(VOICE);

const Dots: React.FC<{ y: number }> = ({ y }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: D.brand, opacity: 0.3 + 0.7 * Math.abs(Math.sin((f + i * 8) / 10)) }} />
      ))}
    </div>
  );
};
const Form: React.FC<{ state: "idle" | "loading" | "error"; a?: number; b?: number }> = ({ state, a = 11, b = 11 }) => (
  <>
    <Header title="رصيد" />
    <Txt y={78} text="أنشئ كلمة مرور جديدة" bold size={20} />
    <Field r={L(14, 150, 272, 48)} label="كلمة المرور" value={"•".repeat(a)} caret={a > 0 && a < 11} ltr />
    <Field r={L(14, 236, 272, 48)} label="تأكيد كلمة المرور" value={"•".repeat(b)} caret={b > 0 && b < 11} ltr />
    {state === "error" ? (
      <div style={{ position: "absolute", left: 14, right: 14, top: 300, borderRadius: 12, background: "#FFF1D6", border: "2px solid #E8A93A", padding: "10px 12px", fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.5 }}>
        انتهت صلاحية رابط إعادة التعيين. أرسلنا لك رابطًا جديدًا على بريدك.
      </div>
    ) : null}
    {state === "loading" ? <Dots y={330} /> : (
      <div style={{ position: "absolute", left: 14, right: 14, top: state === "error" ? 384 : 320, height: 50, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>
        {state === "error" ? "افتح بريدي" : "احفظ كلمة المرور"}
      </div>
    )}
  </>
);

export const C01: React.FC = () => {
  const f = useCurrentFrame();
  const B = { look: 13.2, submit: 27, nothing: 33.2, leave: 42.4, why: 49.4, knows: 58.7, reasons: 67.8, unknown: 77, natural: 82.5 };
  const END = VOICE;
  const mode: DebugMode = f < v(B.nothing) ? "live" : f < v(B.knows) ? "inspect" : "compare";
  const overlay = (
    <>
      <CaseChip y={40} text="بوابة دفع: كلمة مرور جديدة" p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="يكتب كلمتَي المرور ويضغط حفظ" p={span(f, v(B.look), v(B.nothing))} />
      <SideNote y={250} text="مؤشر تحميل، ثم لا شيء" p={span(f, v(B.submit + 2), v(B.nothing))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="غير متطابقتين؟ خطأ آخر؟ الحساب موقوف؟" p={span(f, v(B.nothing), v(B.knows))} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="بلا ردّ، ذهب إلى بوابة أخرى" p={span(f, v(B.leave), v(B.knows))} warn />
      <SideNote y={110} text="النظام يعرف السبب، فليقُله" p={span(f, v(B.knows), v(END))} big icon={wi(IconComment)} />
      <SideNote y={250} text="ردّ واضح: ما حدث، وما الخطوة التالية" p={span(f, v(B.natural), v(END))} icon={wi(IconCheck)} />
      <Strike r={phoneRect} p={f >= v(B.leave) && f < v(B.knows) ? Math.min(1, (f - v(B.leave)) / 20) : 0} />
      <Tap at={19.5} x={150} y={174} />
      <Tap at={23.2} x={150} y={260} />
      <Tap at={B.submit} x={150} y={345} />
      <Mark r={L(14, 150, 272, 48)} from={19.5} to={23} label="كلمة المرور" />
      <Mark r={L(14, 236, 272, 48)} from={23.2} to={26.5} label="التأكيد" />
      <Mark r={L(14, 320, 272, 50)} from={26.6} to={28} label="Submit" />
      <Mark r={L(90, 316, 120, 34)} from={28} to={B.nothing + 5.5} label="Loader" side="below" />
      <Mark r={L(14, 320, 272, 50)} from={B.nothing + 6.2} to={B.leave} label="لا ردّ" />
      <Mark r={L(14, 300, 272, 64)} from={B.knows + 4.5} to={B.natural} label="Feedback" side="below" />
      <Mark r={L(14, 384, 272, 50)} from={B.natural} to={END} label="الخطوة التالية" side="below" />
    </>
  );
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="raseed.app/reset" illustrative overlay={overlay}>
        <PhoneFrame>
          <Screens
            list={[
              { at: 0, node: <Form state="idle" a={0} b={0} /> },
              { at: 20, node: <Form state="idle" a={4} b={0} /> },
              { at: 21, node: <Form state="idle" a={8} b={0} /> },
              { at: 22, node: <Form state="idle" a={11} b={0} /> },
              { at: 23.8, node: <Form state="idle" a={11} b={5} /> },
              { at: 24.8, node: <Form state="idle" a={11} b={11} /> },
              { at: B.submit + 0.3, node: <Form state="loading" /> },
              { at: B.nothing + 6, node: <Form state="idle" /> },
              { at: B.knows + 4, node: <Form state="error" /> },
            ]}
          />
        </PhoneFrame>
      </DebuggerShell>
      <Presenter cam="c01/cam.mp4" />
      <TitleBand title="لا تترك الناس يخمّنون" sub="Visibility of system status" />
      <Voice src="c01/voice.m4a" />
      <IntroCard title="ردّ على كل إجراء" sub="Visibility of system status" points={["Feedback"]} />
      <RecapCard
        voiceSec={VOICE}
        title="النظام يعرف، فليُخبر المستخدم"
        items={[
          { text: "ردّ فوري يُظهر أن الإجراء وصل" },
          { text: "قل ما حدث، وما الخطوة التالية" },
          { text: "مؤشر تحميل ينتهي بلا شيء", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
