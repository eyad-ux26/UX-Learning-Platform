import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, D } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconAlert, IconCheck, IconText } from "../components/Icons";
import { span } from "../lib/timeline";
import { CaseChip, clipFrames, Field, Header, IntroCard, L, Mark, PhoneFrame, phoneRect, Pic, Presenter, RecapCard, Row, Screens, SideNote, Strike, TitleBand, Txt, v, Voice, wi } from "./p02";

/*
 * P02-C09 re-edit: heu 9 "help users recognize, diagnose and recover from errors", 1084.4–1199.1 s. A bare "404"
 * against a page-not-found screen in the user's words with ways out; then wordy and blaming messages against short,
 * clear, calm ones.
 */
const VOICE = 114.7;
export const C09_FRAMES = clipFrames(VOICE);

const Raw = () => (
  <>
    <div style={{ position: "absolute", inset: 0, background: "#FFFFFF" }} />
    <Txt y={200} text="Error 404" bold size={34} x={14} />
    <Txt y={250} text="Not Found" muted size={18} />
  </>
);
const Friendly = ({ links }: { links: boolean }) => (
  <>
    <Header title="إقامة" />
    <Pic y={74} h={130} tone="#F1E6FB" label="🧭" />
    <Txt y={214} text="لم نجد الصفحة التي تبحث عنها" bold size={19} />
    <Txt y={248} text="ربما تغيّر عنوانها. هذه أماكن قد تفيدك:" muted size={14} />
    {links ? (
      <>
        <Row y={282} text="ابحث عن إقامة" h={46} tint />
        <Row y={334} text="الرئيسية" h={46} />
        <Row y={386} text="مركز المساعدة" h={46} />
        <Txt y={448} text="خريطة الموقع ›" size={15} color={D.brand} />
      </>
    ) : null}
  </>
);
const Msg: React.FC<{ text: string; warn?: boolean }> = ({ text, warn }) => (
  <div style={{ position: "absolute", left: 14, right: 14, top: 250, borderRadius: 12, background: warn ? "#FFF1D6" : D.brandSoft, border: `2px solid ${warn ? "#E8A93A" : D.brand}`, padding: "10px 12px", fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.55 }}>{text}</div>
);
const Login: React.FC<{ msg: string; warn?: boolean }> = ({ msg, warn }) => (
  <>
    <Header title="إقامة · تسجيل الدخول" />
    <Field r={L(14, 110, 272, 46)} label="البريد الإلكتروني" value="mona@mail.com" ltr />
    <Field r={L(14, 190, 272, 46)} label="كلمة المرور" value="••••••••" ltr />
    <div style={{ position: "absolute", left: 0, right: 0, top: 10 }}><Msg text={msg} warn={warn} /></div>
  </>
);

export const C09: React.FC = () => {
  const f = useCurrentFrame();
  const B = { raw: 9.3, noSense: 20.2, lang: 25.2, words: 38.8, recover: 47.7, friendly: 57.2, links: 70.8, short: 83.4, wordy: 89.5, tone: 101.1, banned: 112.2 };
  const END = VOICE;
  const mode: DebugMode = f < v(B.lang) ? "inspect" : "compare";
  const overlay = (
    <>
      <CaseChip y={40} text={f < v(B.short) ? "صفحة غير موجودة" : "رسائل الخطأ"} p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="رابط لصفحة لم تعد موجودة" p={span(f, v(0.5), v(B.raw))} />
      <SideNote y={110} text="404: ليست لغة المستخدم" p={span(f, v(B.raw), v(B.lang))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="بلغة المستخدم: لم نجد الصفحة" p={span(f, v(B.lang), v(B.recover))} icon={wi(IconText)} />
      <SideNote y={110} text="وطرق للخروج: روابط مقترحة" p={span(f, v(B.recover), v(B.short))} />
      <SideNote y={250} text="أسلوب لطيف، ورسم، وخريطة للموقع" p={span(f, v(B.friendly), v(B.short))} icon={wi(IconCheck)} />
      <SideNote y={110} text="كلمات قصيرة وواضحة" p={span(f, v(B.short), v(B.tone))} big />
      <SideNote y={250} text="جملتان لا تقولان ما الخطأ" p={span(f, v(B.wordy), v(B.wordy + 6))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="نبرة إيجابية، بلا لوم للمستخدم" p={span(f, v(B.tone), v(END))} big icon={wi(IconCheck)} />
      <Strike r={phoneRect} p={(f >= v(B.raw + 3) && f < v(B.lang) ? Math.min(1, (f - v(B.raw + 3)) / 20) : 0) + (f >= v(B.wordy + 2) && f < v(B.wordy + 6) ? Math.min(1, (f - v(B.wordy + 2)) / 20) : 0) + (f >= v(B.tone + 1) && f < v(B.tone + 6) ? Math.min(1, (f - v(B.tone + 1)) / 20) : 0)} />
      <Mark r={L(10, 190, 200, 90)} from={B.raw + 0.5} to={B.lang} label="404؟" side="below" />
      <Mark r={L(14, 212, 272, 30)} from={B.words} to={B.recover} label="لغة المستخدم" side="below" />
      <Mark r={L(14, 280, 272, 152)} from={B.recover + 0.5} to={B.friendly} label="Recovery" side="below" />
      <Mark r={L(14, 74, 272, 130)} from={B.friendly} to={B.links} label="رسم لطيف" side="below" />
      <Mark r={L(14, 444, 120, 28)} from={B.links} to={B.short} label="خريطة الموقع" side="below" />
      <Mark r={L(14, 258, 272, 100)} from={B.wordy + 0.5} to={B.wordy + 6} label="طويلة ومبهمة" side="below" />
      <Mark r={L(14, 258, 272, 64)} from={B.wordy + 6.5} to={B.tone} label="قصيرة وواضحة" side="below" />
      <Mark r={L(14, 258, 272, 44)} from={B.tone + 0.5} to={B.tone + 6} label="لوم" side="below" />
      <Mark r={L(14, 258, 272, 64)} from={B.tone + 6.5} to={END} label="نبرة إيجابية" side="below" />
    </>
  );
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="iqama.app/oops" illustrative overlay={overlay}>
        <PhoneFrame>
          <Screens
            list={[
              { at: 0, node: <Friendly links={false} /> },
              { at: B.raw, node: <Raw /> },
              { at: B.lang, node: <Friendly links={false} /> },
              { at: B.recover, node: <Friendly links /> },
              { at: B.wordy, node: <Login warn msg="حدث خطأ أثناء معالجة طلبك، ونعتذر عن أي إزعاج. يرجى المحاولة مرة أخرى في وقت لاحق أو التواصل مع فريق الدعم." /> },
              { at: B.wordy + 6, node: <Login msg="كلمة المرور لا تطابق هذا البريد. جرّبها مرة أخرى، أو أعِد تعيينها." /> },
              { at: B.tone, node: <Login warn msg="أدخلت بيانات خاطئة! تأكّد مما تكتبه." /> },
              { at: B.tone + 6, node: <Login msg="لم نجد حسابًا بهذا البريد. تأكّد من كتابته، أو أنشئ حسابًا جديدًا." /> },
            ]}
          />
        </PhoneFrame>
      </DebuggerShell>
      <Presenter cam="c09/cam.mp4" />
      <TitleBand title="خطأ بلغة المستخدم، ومعه المخرج" sub="Help users recover from errors" />
      <Voice src="c09/voice.m4a" />
      <IntroCard title="رسالة خطأ يفهمها الناس ويتصرفون بها" sub="Recognize, diagnose, recover" points={["404", "User language"]} />
      <RecapCard
        voiceSec={VOICE}
        title="قل ما حدث، وكيف يخرج منه"
        items={[
          { text: "لغة المستخدم، لا رموز مثل 404" },
          { text: "كلمات قصيرة، وطرق واضحة للخروج" },
          { text: "رسائل طويلة مبهمة أو تلوم المستخدم", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
