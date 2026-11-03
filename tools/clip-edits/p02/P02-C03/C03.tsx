import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { D } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { IconAlert, IconBack, IconCheck } from "../components/Icons";
import { span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, Mark, PhoneFrame, phoneRect, Pic, Presenter, RecapCard, Row, Screens, SideNote, Strike, Tap, TitleBand, Txt, v, Voice, wi } from "./p02";

/*
 * P02-C03 re-edit: heu 3 "user control and freedom", 90.0–196.8 s. Back from a reviews page returns to the product
 * (right); Back that jumps to the home page, and Back from a booking that drops the flight results (wrong).
 */
const VOICE = 106.8;
export const C03_FRAMES = clipFrames(VOICE);

const Home = () => (
  <>
    <Header title="سوق لين" />
    <Txt y={76} text="الرئيسية" bold size={20} />
    <Pic y={112} h={120} tone="#FFE3EE" label="🛋️" />
    <Row y={246} text="كراسي" sub="120 منتج" />
    <Row y={310} text="طاولات" sub="84 منتج" />
    <Row y={374} text="إضاءة" sub="60 منتج" />
  </>
);
const Product = () => (
  <>
    <Header title="كرسي دانة" back />
    <Pic y={74} h={190} tone="#EDEFF3" label="🪑" />
    <Txt y={276} text="كرسي دانة بذراعين" bold size={19} />
    <Txt y={306} text="★★★★☆ 4.5 · 483 تقييمًا" size={15} color={D.brand} />
    <Txt y={336} text="1,250 جنيه" bold size={18} />
    <div style={{ position: "absolute", left: 14, right: 14, top: 500, height: 52, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17 }}>أضف إلى السلة</div>
  </>
);
const Reviews = () => (
  <>
    <Header title="التقييمات" back />
    <Txt y={78} text="4.5 من 5" bold size={30} />
    <Txt y={122} text="483 تقييمًا" muted />
    <Row y={160} text="«مريح جدًا وخامته ممتازة»" sub="منى · منذ أسبوع" h={64} />
    <Row y={234} text="«اللون مطابق للصورة»" sub="أحمد · منذ شهر" h={64} />
    <Row y={308} text="«وصل في يومين»" sub="سلمى · منذ شهرين" h={64} />
  </>
);
const Search = ({ empty }: { empty?: boolean }) => (
  <>
    <Header title="جناح" />
    <Txt y={78} text="ابحث عن رحلة" bold size={20} />
    <Row y={118} text={empty ? "من" : "من: القاهرة"} />
    <Row y={182} text={empty ? "إلى" : "إلى: دبي"} />
    <Row y={246} text={empty ? "التاريخ" : "12 نوفمبر · بالغان"} />
    <div style={{ position: "absolute", left: 14, right: 14, top: 320, height: 52, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17 }}>ابحث</div>
  </>
);
const Results = () => (
  <>
    <Header title="القاهرة ← دبي" back />
    <div style={{ position: "absolute", left: 14, right: 14, top: 72, display: "flex", gap: 8 }}>
      {["مباشر", "صباحًا", "أقل من 9,000"].map((t) => (
        <span key={t} style={{ padding: "6px 12px", borderRadius: 999, background: D.brandSoft, color: D.brand, fontSize: 13, fontWeight: 700 }}>{t}</span>
      ))}
    </div>
    <Row y={116} text="9:40 ص ← 1:55 م" sub="مباشر · 8,450 جنيه" h={64} />
    <Row y={190} text="11:10 ص ← 3:20 م" sub="مباشر · 8,900 جنيه" h={64} tint />
    <Row y={264} text="7:05 ص ← 11:30 ص" sub="مباشر · 8,700 جنيه" h={64} />
  </>
);
const Booking = () => (
  <>
    <Header title="بيانات المسافر" back />
    <Txt y={78} text="11:10 ص ← 3:20 م · 8,900 جنيه" muted size={14} />
    <Row y={110} text="الاسم كما في جواز السفر" />
    <Row y={174} text="رقم الجواز" />
    <div style={{ position: "absolute", left: 14, right: 14, top: 250, height: 52, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17 }}>متابعة</div>
  </>
);

export const C03: React.FC = () => {
  const f = useCurrentFrame();
  const B = { reviews: 4, path: 8, good: 20, other: 26, job: 34, one: 46, uc: 54, three: 64, flights: 68, book: 78, back: 86, lost: 92, again: 100 };
  const END = VOICE;
  const mode: DebugMode = f < v(B.good) ? "live" : f < v(B.flights) ? "inspect" : f < v(B.back) ? "live" : "inspect";
  const shop = f < v(B.flights);
  const overlay = (
    <>
      <CaseChip y={40} text={shop ? "مثال 1: متجر" : "مثال 2: حجز طيران"} p={span(f, v(0.5), v(END))} />
      <SideNote y={110} text="التقييمات تفتح كصفحة كاملة" p={span(f, v(B.reviews), v(B.good))} />
      <SideNote y={110} text="Back يعيده إلى المنتج نفسه" p={span(f, v(B.good), v(B.other))} icon={wi(IconCheck)} />
      <SideNote y={110} text="تطبيقات أخرى: Back يعيد إلى الرئيسية" p={span(f, v(B.other), v(B.job))} warn icon={wi(IconAlert)} />
      <SideNote y={110} text="يجب أن يعرف المستخدم إلى أين سيذهب" p={span(f, v(B.job), v(B.flights))} />
      <SideNote y={250} text="Back = خطوة واحدة فقط" p={span(f, v(B.one), v(B.flights))} big icon={wi(IconBack)} />
      <SideNote y={390} text="مخرج إلى المكان الذي يتوقعه، لا 3 خطوات" p={span(f, v(B.uc), v(B.flights))} />
      <SideNote y={110} text="بحث ← نتائج بالفلاتر ← حجز" p={span(f, v(B.flights + 1), v(B.back))} />
      <SideNote y={110} text="Back أعاده إلى أول صفحة البحث" p={span(f, v(B.back), v(END))} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="ضاعت النتائج والفلاتر، فيبحث من جديد" p={span(f, v(B.lost), v(END))} warn />
      <Strike r={phoneRect} p={span(f, v(B.lost + 2), v(END)) * Math.min(1, (f - v(B.lost + 2)) / 20)} />
      <Mark r={L(14, 300, 272, 28)} from={1.5} to={B.reviews + 0.3} label="483 تقييمًا" />
      <Mark r={L(8, 8, 48, 44)} from={B.good - 2.5} to={B.good - 0.7} label="Back" side="below" />
      <Mark r={L(14, 74, 272, 190)} from={B.good} to={B.other} label="المنتج نفسه" side="below" />
      <Mark r={L(8, 8, 48, 44)} from={B.other - 0.5} to={B.other + 1.2} label="Back" side="below" />
      <Mark r={L(14, 70, 272, 160)} from={B.other + 1.5} to={B.job} label="الرئيسية!" side="below" />
      <Mark r={L(8, 8, 48, 44)} from={B.one} to={B.uc} label="خطوة واحدة" side="below" />
      <Mark r={L(14, 118, 272, 180)} from={B.flights + 0.5} to={B.flights + 3.8} label="البحث" side="below" />
      <Mark r={L(14, 68, 272, 34)} from={B.flights + 4.3} to={B.book - 2} label="الفلاتر" side="below" />
      <Mark r={L(14, 190, 272, 64)} from={B.book - 2} to={B.book - 1.5} label="الرحلة" />
      <Mark r={L(8, 8, 48, 44)} from={B.back - 2.2} to={B.back - 0.6} label="Back" side="below" />
      <Mark r={L(14, 118, 272, 180)} from={B.back} to={B.lost + 2} label="بحث فارغ" side="below" />
      <Strike r={L(0, 0, 300, 582)} p={f > v(B.other + 3) && f < v(B.job) ? Math.min(1, (f - v(B.other + 3)) / 20) : 0} />
      <Tap at={B.reviews} x={150} y={316} />
      <Tap at={B.good - 1} x={30} y={30} />
      <Tap at={B.other + 1} x={30} y={30} />
      <Tap at={B.book - 2} x={150} y={222} />
      <Tap at={B.back - 1} x={30} y={30} />
    </>
  );
  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={shop ? "shop.app/chair" : "janah.app/flights"} illustrative overlay={overlay}>
        <PhoneFrame>
          <Screens
            list={[
              { at: 0, node: <Product /> },
              { at: B.reviews + 0.3, node: <Reviews /> },
              { at: B.good - 0.7, node: <Product /> },
              { at: B.other, node: <Reviews /> },
              { at: B.other + 1.3, node: <Home /> },
              { at: B.job, node: <Product /> },
              { at: B.flights, node: <Search /> },
              { at: B.flights + 4, node: <Results /> },
              { at: B.book - 1.7, node: <Booking /> },
              { at: B.back - 0.7, node: <Search empty /> },
            ]}
          />
        </PhoneFrame>
      </DebuggerShell>
      <Presenter cam="c03/cam.mp4" />
      <TitleBand title="الرجوع يعيد خطوة واحدة" sub="User control and freedom" />
      <Voice src="c03/voice.m4a" />
      <IntroCard title="مخرج إلى المكان الذي يتوقعه الناس" sub="User control and freedom" points={["Back", "خطوة واحدة"]} />
      <RecapCard
        voiceSec={VOICE}
        title="Back يعيد خطوة واحدة"
        items={[
          { text: "العودة إلى المكان الذي جاء منه المستخدم بالضبط" },
          { text: "الاحتفاظ بالنتائج والفلاتر التي اختارها" },
          { text: "Back يعيد إلى الرئيسية أو إلى أول البحث", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
