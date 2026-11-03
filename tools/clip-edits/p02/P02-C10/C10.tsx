import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, D } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconAlert, IconCheck, IconText, IconSearch } from "../components/Icons";
import { span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, Mark, PhoneFrame, phoneRect, Pic, Presenter, RecapCard, Screens, SideNote, Strike, Tap, TitleBand, Txt, v, Voice, wi } from "./p02";

/*
 * P02-C10 re-edit: heu 10 "help and documentation", 919.8–1095.3 s. A help article built for scanning (breadcrumb,
 * titles, numbered steps, coloured keywords, a video with written steps) against a wall of text, and a faint search box
 * against a clear one that highlights the searched word.
 */
const VOICE = 175.5;
export const C10_FRAMES = clipFrames(VOICE);

const Crumb = () => <Txt y={70} text="المساعدة › الحجوزات › تغيير موعد" size={13} color={D.brand} />;
const Step: React.FC<{ y: number; n: number; text: string; k?: string }> = ({ y, n, text, k }) => (
  <div style={{ position: "absolute", left: 14, right: 14, top: y, display: "flex", gap: 10, fontSize: 15, color: C.text, lineHeight: 1.45 }}>
    <span style={{ width: 26, height: 26, borderRadius: 13, background: D.brandSoft, color: D.brand, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
    <span>{text}{k ? <b style={{ color: D.brand }}> {k}</b> : null}</span>
  </div>
);
const Article = () => (
  <>
    <Header title="دليل · المساعدة" back />
    <Crumb />
    <Txt y={98} text="كيف أغيّر موعد حجزي؟" bold size={20} />
    <Txt y={136} text="الخطوات" bold size={15} color={C.textMuted} />
    <Step y={164} n={1} text="افتح" k="حجوزاتي" />
    <Step y={204} n={2} text="اضغط الحجز الذي تريد تغييره" />
    <Step y={244} n={3} text="اضغط" k="غيّر الموعد" />
    <Step y={284} n={4} text="اختر يومًا ووقتًا، ثم اضغط" k="تأكيد" />
    <Txt y={340} text="ملاحظات" bold size={15} color={C.textMuted} />
    <Txt y={366} text="• التغيير مجاني حتى 24 ساعة قبل الموعد" size={14} />
    <Txt y={394} text="• يصلك تأكيد برسالة" size={14} />
  </>
);
const Wall = () => (
  <>
    <Header title="دليل · المساعدة" back />
    <Txt y={74} size={14} text="بخصوص تغيير المواعيد فإنه يمكن للعميل في حال رغبته في تعديل الموعد المحجوز مسبقًا أن يقوم بالدخول إلى الحساب ثم الانتقال إلى الصفحة الخاصة بالحجوزات ومن ثم اختيار الحجز المطلوب والضغط على الخيار المناسب لتغيير الموعد مع العلم أن التغيير قد يخضع لرسوم إضافية في حال تم قبل أقل من أربع وعشرين ساعة من الموعد الأصلي وفي جميع الأحوال يتم إرسال رسالة تأكيد إلى العميل بعد إتمام العملية كما يمكن التواصل مع خدمة العملاء في حال وجود أي استفسار إضافي يتعلق بسياسة التغيير أو الإلغاء أو استرداد المبالغ المدفوعة." />
  </>
);
const VideoSteps = () => (
  <>
    <Header title="دليل · المساعدة" back />
    <Crumb />
    <Pic y={98} h={140} tone="#E6EAF0" label="▶" />
    <Step y={254} n={1} text="افتح" k="حجوزاتي" />
    <Step y={294} n={2} text="اضغط الحجز الذي تريد تغييره" />
    <Step y={334} n={3} text="اضغط" k="غيّر الموعد" />
  </>
);
const Search: React.FC<{ clear?: boolean; results?: boolean }> = ({ clear, results }) => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 170, background: clear ? "#FFFFFF" : "#DCE7F5" }} />
    <Txt y={30} text="كيف نساعدك؟" bold size={22} />
    <div style={{ position: "absolute", left: 14, right: 14, top: 76, height: 50, borderRadius: 12, background: clear ? "#FFFFFF" : "#EEF3FA", border: clear ? `2px solid ${D.brand}` : "1px solid #E6EDF7", boxShadow: clear ? "0 6px 16px rgba(51,65,85,0.18)" : undefined, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, color: clear ? C.text : "#C7D3E3" }}>
      {results ? "تغيير موعد" : "🔍 ابحث في المساعدة"}
    </div>
    {results ? (
      <>
        {[["كيف أغيّر ", "موعد", " حجزي؟"], ["رسوم ", "تغيير", " الموعد المتأخر"], ["إلغاء حجز أو ", "تغيير", " الطبيب"]].map(([a, k, b], i) => (
          <div key={i} style={{ position: "absolute", left: 14, right: 14, top: 150 + i * 62, height: 52, borderRadius: 12, background: "#F4F5F7", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: C.text }}>
            <span>{a}<mark style={{ background: "#FFE59A", padding: "0 3px", borderRadius: 4 }}>{k}</mark>{b}</span>
          </div>
        ))}
      </>
    ) : null}
  </>
);

export const C10: React.FC = () => {
  const f = useCurrentFrame();
  const B = { chunk: 12.2, hier: 21.2, keys: 27.2, dest: 36.2, bullets: 45.2, crumb: 60.2, bad: 69.2, scan: 78.2, media: 84.2, text: 96.2, both: 102.2, memory: 111.2, search: 120.2, faint: 129.2, good: 138.2, highlight: 150.2, next: 163.2 };
  const END = VOICE;
  const mode: DebugMode = f < v(B.bad) ? "inspect" : f < v(B.media) ? "compare" : f < v(B.faint) ? "inspect" : "compare";
  const overlay = (
    <>
      <CaseChip y={40} text="مركز المساعدة" p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="مساعدة مفصّلة تجيب عن كل سؤال" p={span(f, v(0.5), v(B.chunk))} />
      <SideNote y={110} text="جمِّع المعلومات المرتبطة معًا (Chunking)" p={span(f, v(B.chunk), v(B.dest))} />
      <SideNote y={250} text="تسلسل بصري، وكلمات مهمة بلون مختلف" p={span(f, v(B.hier), v(B.dest))} />
      <SideNote y={110} text="أقسام، ثم عناوين، ثم خطوات مرقّمة" p={span(f, v(B.dest), v(B.bad))} icon={wi(IconText)} />
      <SideNote y={250} text="مسار (Breadcrumb) يُظهر أين أنت" p={span(f, v(B.crumb), v(B.bad))} />
      <SideNote y={110} text="نص متصل بلا ترتيب ولا عناوين" p={span(f, v(B.bad), v(B.media))} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="أصعب في التصفّح، وأبطأ للوصول" p={span(f, v(B.scan), v(B.media))} warn />
      <SideNote y={110} text="فيديو، ومعه الخطوات مكتوبة" p={span(f, v(B.media), v(B.search))} />
      <SideNote y={250} text="لا يحفظ الخطوات من الفيديو، بل يراها (Recognition)" p={span(f, v(B.both), v(B.search))} />
      <SideNote y={110} text="البحث يجب أن يكون واضحًا" p={span(f, v(B.search), v(B.good))} icon={wi(IconSearch)} />
      <SideNote y={250} text="بحث باهت بتباين منخفض" p={span(f, v(B.faint), v(B.good))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="بحث بارز بحدود وأولوية بصرية" p={span(f, v(B.good), v(END))} big icon={wi(IconCheck)} />
      <SideNote y={250} text="أبرِز الكلمة التي بحث بها" p={span(f, v(B.highlight), v(END))} />
      <Strike r={phoneRect} p={(f >= v(B.bad + 2) && f < v(B.media) ? Math.min(1, (f - v(B.bad + 2)) / 20) : 0) + (f >= v(B.faint + 2) && f < v(B.good) ? Math.min(1, (f - v(B.faint + 2)) / 20) : 0)} />
      <Mark r={L(14, 98, 272, 30)} from={2} to={B.chunk} label="سؤال واحد" side="below" />
      <Mark r={L(14, 160, 272, 160)} from={B.chunk} to={B.hier} label="Chunk" side="below" />
      <Mark r={L(150, 160, 136, 150)} from={B.keys} to={B.dest} label="كلمات بلون مختلف" side="below" />
      <Mark r={L(14, 160, 272, 160)} from={B.bullets} to={B.crumb} label="خطوات مرقّمة" side="below" />
      <Mark r={L(14, 66, 272, 24)} from={B.crumb} to={B.bad} label="Breadcrumb" side="below" />
      <Mark r={L(14, 72, 272, 300)} from={B.scan} to={B.media} label="نص متصل" side="below" />
      <Mark r={L(14, 98, 272, 140)} from={B.media + 1} to={B.text} label="فيديو" side="below" />
      <Mark r={L(14, 250, 272, 120)} from={B.text} to={B.search} label="الخطوات مكتوبة" side="below" />
      <Mark r={L(14, 76, 272, 50)} from={B.faint} to={B.good} label="تباين منخفض" side="below" />
      <Mark r={L(14, 76, 272, 50)} from={B.good + 1} to={B.highlight} label="بحث واضح" side="below" />
      <Mark r={L(14, 150, 272, 176)} from={B.highlight + 1} to={END} label="الكلمة مُبرزة" side="below" />
      <Tap at={B.highlight - 1} x={150} y={100} />
    </>
  );
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="dalil.app/help" illustrative overlay={overlay}>
        <PhoneFrame>
          <Screens
            list={[
              { at: 0, node: <Article /> },
              { at: B.bad, node: <Wall /> },
              { at: B.media, node: <VideoSteps /> },
              { at: B.search, node: <Search /> },
              { at: B.good, node: <Search clear /> },
              { at: B.highlight, node: <Search clear results /> },
            ]}
          />
        </PhoneFrame>
      </DebuggerShell>
      <Presenter cam="c10/cam.mp4" />
      <TitleBand title="مساعدة تُتصفّح وتُبحث بسهولة" sub="Help and documentation" />
      <Voice src="c10/voice.m4a" />
      <IntroCard title="مساعدة يجد فيها الناس الإجابة بسرعة" sub="Help and documentation" points={["Reactive help", "Search"]} />
      <RecapCard
        voiceSec={VOICE}
        title="رتّب المساعدة ليسهل تصفّحها"
        items={[
          { text: "عناوين وخطوات مرقّمة وكلمات مفتاحية بارزة" },
          { text: "بحث واضح يُبرز الكلمة التي بحث بها الناس" },
          { text: "نص متصل بلا عناوين، وبحث باهت", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
