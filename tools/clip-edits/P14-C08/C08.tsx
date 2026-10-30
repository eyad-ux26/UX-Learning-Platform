import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconAlert, IconCheck, IconHome, IconSearch, IconSpark } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";
import { CaseChip, clipFrames, IntroCard, L, ListCard, loc, mid, PH, PhoneFrame, phoneRect, Presenter, RecapCard, SideNote, Strike, TitleBand, v, Voice, wi } from "./p14";

/*
 * P14-C08 re-edit: WP 23 "the no-results page" (737.05–946.35 s). A search in an electronics store finds nothing; the
 * page goes from a buried message, to a clear one with next steps, past a joke that misfires, to the good example.
 */
const VOICE = 209.3;
export const C08_FRAMES = clipFrames(VOICE);

const QUERY = "شاحن لاسكي";
const searchRect = L(14, 14, PH.w - 28, 46);
const msgSmall = L(14, 72, PH.w - 28, 22);
const msgBig = L(14, 78, PH.w - 28, 96);
const fixRect = L(14, 186, PH.w - 28, 40);
const chipsRect = L(14, 262, PH.w - 28, 84);
const btnsRect = L(14, 470, PH.w - 28, 96);

const Chip: React.FC<{ t: string; o: number }> = ({ t, o }) => (
  <span style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px", borderRadius: 17, border: `1.5px solid ${C.border}`, fontSize: 14, fontWeight: 600, color: C.text, opacity: o, background: "#FFFFFF" }}>{t}</span>
);

export const C08: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    type: v(0.3), results: v(5.5), leave: v(9.5), keep: v(15.9), what: v(28.6), g1: v(32.9), clear: v(37.2),
    bad: v(49.2), badBusy: v(63.5), fix1: v(73.7),
    g2: v(79.0), edit: v(82.3), related: v(86.9), tapRel: v(98.7), back: v(102.6), ways: v(112.1), noDead: v(124.0),
    g3: v(134.7), joke: v(140.0), backfire: v(148.7), fail: v(159.9),
    good: v(167.3), gClear: v(173.1), gSugg: v(180.6), gSpell: v(185.0), gGeneral: v(190.3), gRelated: v(194.3), gNoJoke: v(199.4),
  };
  const END = v(VOICE) + 6;

  // ---- product state ------------------------------------------------------------------------
  const typed = QUERY.slice(0, Math.round(QUERY.length * Math.min(1, Math.max(0, (f - B.type) / 50))));
  type Page = "search" | "bad" | "fixed" | "joke" | "good";
  const page: Page = f < B.bad ? "search" : f < B.fix1 ? "bad" : f < B.g3 ? "fixed" : f < B.good ? "joke" : "good";
  const cuts = [B.bad, B.fix1, B.g3, B.good];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const shown = f >= B.results;
  const withNext = page === "good" || (page === "fixed" && f >= B.edit);
  const pRelated = page === "good" ? 1 : page === "fixed" ? enter(f, B.related, 12) : 0;
  const pBtns = page === "good" ? 1 : page === "fixed" ? enter(f, B.back, 12) : 0;

  // ---- camera -----------------------------------------------------------------------------
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [{ f: 0, ...overview }];
  const cam = cameraAt(f, shots);
  const mode: DebugMode = f < B.results ? "live" : (f >= B.fix1 && f < B.g3) || f >= B.good ? "compare" : "inspect";
  const dim = Math.max(span(f, B.bad + 20, B.fix1), span(f, B.joke, B.good)) * 0.9;

  const tap = (at: number, r: Rect) => {
    const p = camPoint(mid(r), cam);
    return { keys: [{ f: at - 16, x: p.x - 40, y: p.y + 120 }, { f: at, ...p, click: true }, { f: at + 16, ...p }] as Key[], from: at - 18, to: at + 24 };
  };
  const touches = [tap(B.type - 2, searchRect), tap(B.tapRel, L(14, 300, 110, 34))];
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);

  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      <SideNote y={110} text="بحث لم يجد أي نتيجة" p={span(f, B.results, B.what)} icon={wi(IconSearch)} />
      <SideNote y={250} text="خطر كبير: قد يترك الموقع" p={span(f, B.leave, B.what)} warn icon={wi(IconAlert)} />
      <SideNote y={390} text="ربما توجد نتائج قريبة، فساعده ليبقى" p={span(f, B.keep, B.what)} />
      <SideNote y={110} text="ماذا نفعل في صفحة No results؟" p={span(f, B.what, B.g2)} big />

      <CaseChip y={40} text="Guideline 1" p={span(f, B.g1, B.g2)} />
      <SideNote y={250} text="قل بوضوح: لا توجد نتائج" p={span(f, B.clear, B.g2)} icon={wi(IconCheck)} />
      <SideNote y={390} text="حتى يفهم من البداية، ولا يظل يبحث" p={span(f, B.clear + 90, B.bad)} />
      <Selection r={camRect(msgSmall, cam)} hover={sel(B.bad + 40, B.fix1)} selected={sel(B.bad + 40, B.fix1)} label="Hierarchy صغيرة" />
      <SideNote y={390} text="الرسالة صغيرة وسط صفحة مزدحمة" p={span(f, B.bad + 30, B.fix1)} warn />
      <Selection r={camRect(msgBig, cam)} hover={sel(B.fix1 + 10, B.g2)} selected={sel(B.fix1 + 10, B.g2)} label="واضحة من أول نظرة" />

      <CaseChip y={40} text="Guideline 2" p={span(f, B.g2, B.g3)} />
      <SideNote y={110} text="لا توقفه: أعطه Path آخر" p={span(f, B.g2, B.g3)} big />
      <SideNote y={250} text="اقترح تعديل الكلمات التي كتبها" p={span(f, B.edit, B.related)} icon={wi(IconSpark)} />
      <Selection r={camRect(fixRect, cam)} hover={sel(B.edit + 10, B.related)} selected={sel(B.edit + 10, B.related)} label="تصحيح" />
      <SideNote y={250} text="واقترح بحثًا قريبًا له نتائج" p={span(f, B.related, B.back)} icon={wi(IconSearch)} />
      <Selection r={camRect(chipsRect, cam)} hover={sel(B.related + 10, B.back)} selected={sel(B.related + 10, B.back)} label="بحث قريب" />
      <SideNote y={250} text="وزرًا للرجوع: الرئيسية أو الأقسام" p={span(f, B.back, B.ways)} icon={wi(IconHome)} />
      <Selection r={camRect(btnsRect, cam)} hover={sel(B.back + 10, B.ways)} selected={sel(B.back + 10, B.ways)} label="طرق أخرى" />
      <SideNote y={250} text="أكثر من طريق يكمل منه" p={span(f, B.ways, B.g3)} />
      <SideNote y={390} text="حتى لا يشعر أنه لا شيء يفعله هنا" p={span(f, B.noDead, B.g3)} warn />

      <CaseChip y={40} text="Guideline 3" p={span(f, B.g3, B.good)} />
      <SideNote y={110} text="لا تمزح ولا تسخر من المستخدم" p={span(f, B.g3, B.good)} big warn icon={wi(IconAlert)} />
      <SideNote y={250} text="المزاح هنا قد يضايقه فيغادر" p={span(f, B.backfire, B.good)} warn />
      <SideNote y={390} text="هو فشل في هدفه، فلا وقت للمزاح" p={span(f, B.fail, B.good)} />

      <CaseChip y={40} text="مثال جيد" p={span(f, B.good, END)} />
      <ListCard
        y={110}
        p={span(f, B.good + 10, END)}
        title="كل الـ Guidelines معًا"
        items={[
          { text: "رسالة واضحة: لا توجد نتائج", p: enter(f, B.gClear) },
          { text: "يعدّل البحث: تصحيح الإملاء", p: enter(f, B.gSpell) },
          { text: "كلمات أعمّ أو أقل", p: enter(f, B.gGeneral) },
          { text: "بحث قريب يضغط عليه", p: enter(f, B.gRelated) },
          { text: "لا مزاح ولا سخرية", p: enter(f, B.gNoJoke) },
        ]}
      />
      {touches.map((t, i) => (
        <UserTouch key={i} frame={f} keys={t.keys} from={t.from} to={t.to} />
      ))}
    </>
  );

  const busy = ["عروض الأسبوع", "سماعات", "ساعات ذكية", "لابتوب", "تلفزيونات", "إكسسوارات"];

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="volt.app/search" illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>
            <div style={{ ...loc(searchRect), borderRadius: 23, border: `2px solid ${D.brand}`, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", fontSize: 17, fontWeight: 600, color: C.text }}>
              <IconSearch color={C.textMuted} size={20} />
              {page === "search" ? typed : QUERY}
              {page === "search" && f < B.results ? <span style={{ width: 2, height: 22, background: D.brand }} /> : null}
            </div>
            {page === "search" && shown ? (
              <div style={{ position: "absolute", top: 110, left: 14, right: 14, textAlign: "center", opacity: enter(f, B.results, 12) }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>لا توجد نتائج لـ «{QUERY}»</div>
                <div style={{ fontSize: 15, color: C.textMuted, marginTop: 10 }}>…</div>
              </div>
            ) : null}
            {page === "bad" ? (
              <>
                <div style={{ ...loc(msgSmall), fontSize: 12, color: C.textMuted }}>0 نتيجة لبحثك</div>
                <div style={{ position: "absolute", top: 100, left: 14, right: 14, height: 120, borderRadius: 14, background: D.brand, color: D.onBrand, padding: 16, boxSizing: "border-box", fontSize: 22, fontWeight: 800 }}>خصم 30% على الشاشات</div>
                <div style={{ position: "absolute", top: 232, left: 14, right: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {busy.map((b) => (
                    <div key={b} style={{ height: 96, borderRadius: 12, background: C.surfaceAlt, display: "flex", alignItems: "flex-end", padding: 10, fontSize: 14, fontWeight: 700, color: C.text }}>{b}</div>
                  ))}
                </div>
              </>
            ) : null}
            {page === "fixed" || page === "good" ? (
              <>
                <div style={{ ...loc(msgBig), textAlign: "center", paddingTop: 6 }}>
                  <div style={{ fontSize: 23, fontWeight: 800, color: C.text, lineHeight: 1.35 }}>لا توجد نتائج لـ «{QUERY}»</div>
                  {page === "good" ? <div style={{ fontSize: 14, color: C.textMuted, marginTop: 6 }}>تأكد من الإملاء، أو جرّب كلمات أقل أو أعم</div> : null}
                </div>
                {withNext ? (
                  <div style={{ ...loc(fixRect), borderRadius: 10, background: D.brandSoft, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 16, fontWeight: 600, color: C.text, opacity: page === "good" ? 1 : enter(f, B.edit, 12) }}>
                    هل تقصد:&nbsp;<b style={{ color: D.brand, textDecoration: "underline" }}>شاحن لاسلكي</b>؟
                  </div>
                ) : null}
                {pRelated > 0 ? (
                  <div style={{ ...loc({ ...chipsRect, y: chipsRect.y - 26, h: 22 }), fontSize: 14, fontWeight: 700, color: C.textMuted, opacity: pRelated }}>عمليات بحث قريبة</div>
                ) : null}
                <div style={{ ...loc(chipsRect), display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
                  {["شاحن سريع", "شاحن", "كابل شحن", "باور بانك"].map((t, i) => (
                    <Chip key={t} t={t} o={pRelated * (page === "good" ? 1 : enter(f, B.related + i * 8, 10))} />
                  ))}
                </div>
                {pBtns > 0 ? (
                  <div style={{ ...loc(btnsRect), display: "flex", flexDirection: "column", gap: 10, opacity: pBtns }}>
                    <div style={{ height: 43, borderRadius: 12, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>تصفّح كل الأقسام</div>
                    <div style={{ height: 43, borderRadius: 12, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.text }}>الرجوع للرئيسية</div>
                  </div>
                ) : null}
              </>
            ) : null}
            {page === "joke" ? (
              <>
                <div style={{ position: "absolute", top: 90, left: 14, right: 14, textAlign: "center", opacity: enter(f, B.joke, 12) }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: D.brand }}>أوبس!</div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: C.text, lineHeight: 1.4, marginTop: 6 }}>حتى نحن لا نعرف ما تبحث عنه</div>
                  <div style={{ fontSize: 15, color: C.textMuted, marginTop: 8 }}>جرّب أن تكتب بشكل صحيح المرة القادمة ;)</div>
                </div>
                <Strike r={L(14, 80, PH.w - 28, 200)} p={enter(f, B.backfire, 18)} />
              </>
            ) : null}
          </PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c08/cam.mp4" />
      <TitleBand title="البحث لم يجد شيئًا، ثم ماذا؟" sub="No results page" />
      <Voice src="c08/voice.m4a" />
      <IntroCard title="صفحة No results لا تترك الناس عالقين" sub="Search · No results" points={["3 Guidelines", "مثال جيد"]} />
      <RecapCard
        voiceSec={VOICE}
        title="لا نتائج؟ قلها بوضوح، ثم أعطه طريقًا"
        items={[
          { text: "رسالة واضحة وكبيرة: لا توجد نتائج" },
          { text: "تصحيح الإملاء، أو بحث قريب له نتائج" },
          { text: "أزرار للرجوع أو تصفّح الأقسام" },
          { text: "مزاح أو سخرية من المستخدم", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
