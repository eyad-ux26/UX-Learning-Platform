import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection, Tag } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconAlert, IconCheck, IconEye, IconHash, IconLoop } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, ListCard, mid, PH, PhoneFrame, phoneRect, Presenter, RecapCard, s, SideNote, TitleBand, v, Voice, wi } from "./p14";

/*
 * P14-C04 re-edit: WP 14 "accordion: drawbacks and when to use it" (118.45–287.92 s). An illustrative shop app acts out
 * each point; Eyad's voice and camera are kept (his camera ends 5.6 s before the clip, so the card fades out there).
 */
const VOICE = 169.47;
export const C04_FRAMES = clipFrames(VOICE);

type Sec = { t: string; body: string[]; p: number; done?: boolean; warn?: number };
const HEAD = 52;
const LINE = 26;
const TOP = 74;

/** Accordion sections stacked from TOP; returns header rects so overlays can point at them. */
const layout = (secs: Sec[]) => {
  let y = TOP;
  return secs.map((s) => {
    const head: Rect = L(14, y, PH.w - 28, HEAD);
    const bodyH = (s.body.length * LINE + 16) * s.p;
    const body: Rect = L(14, y + HEAD, PH.w - 28, bodyH);
    y += HEAD + bodyH + 8;
    return { head, body };
  });
};

const Accordion: React.FC<{ secs: Sec[] }> = ({ secs }) => {
  const rs = layout(secs);
  return (
    <>
      {secs.map((s, i) => {
        const { head, body } = rs[i];
        return (
          <React.Fragment key={s.t}>
            <div style={{ position: "absolute", left: head.x - PH.x, top: head.y - PH.y, width: head.w, height: head.h, borderRadius: s.p > 0.05 ? "12px 12px 0 0" : 12, background: s.done ? D.brandSoft : C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", boxSizing: "border-box", fontSize: 17, fontWeight: 700, color: C.text }}>
              <span>{s.done ? "✓ " : ""}{s.t}</span>
              <span style={{ display: "inline-block", rotate: `${s.p * 180}deg`, color: C.textMuted }}>⌄</span>
            </div>
            {s.p > 0.02 ? (
              <div style={{ position: "absolute", left: body.x - PH.x, top: body.y - PH.y, width: body.w, height: body.h, overflow: "hidden", background: "#FFFFFF", border: `2px solid ${C.surfaceAlt}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "8px 14px", boxSizing: "border-box" }}>
                {s.body.map((l, k) => (
                  <div key={l} style={{ height: LINE, fontSize: 14, color: k === 0 && s.warn ? C.warning : C.textMuted, fontWeight: k === 0 && s.warn ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</div>
                ))}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

export const C04: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    split: v(0.5), many: v(6.0), open1: v(10.4), open2: v(12.0), open3: v(13.6), open4: v(15.2), cost: v(16.68), cost2: v(22.5),
    disc: v(31.4), hidden: v(38.58), never: v(44.0),
    when: v(46.74), recapCons: v(51.22),
    c1: v(60.9), c1Open: v(68.0), c1Note: v(72.68), c1No: v(78.38),
    c2: v(87.1), c2Next1: v(99.0), c2Back: v(107.0), c2Ex: v(109.98), c2Next2: v(117.0), c2Fit: v(121.3),
    c3: v(126.02), c3Ind: v(131.44), c3Open: v(150.0), c3Open2: v(156.5), c3Avoid: v(160.28),
  };
  const END = v(VOICE) + 6;
  const tw = (a: number, b: number) => span(f, a, b, 12);

  // ---- product state ------------------------------------------------------------------------
  type Scene = "product" | "plan" | "checkout" | "faq";
  const scene: Scene = f < B.c1 ? "product" : f < B.c2 ? "plan" : f < B.c3 ? "checkout" : "faq";
  const cuts = [B.c1, B.c2, B.c3];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));

  let title = "سمّاعة لاسلكية";
  let secs: Sec[] = [];
  if (scene === "product") {
    const closeAll = B.disc - 10;
    secs = [
      { t: "الوصف", body: ["صوت نقي وعزل للضوضاء.", "بطارية حتى 30 ساعة."], p: tw(B.open1, closeAll) },
      { t: "المواصفات", body: ["Bluetooth 5.3", "الوزن 48 جرامًا"], p: tw(B.open2, closeAll) },
      { t: "الشحن والإرجاع", body: ["لا يمكن إرجاع هذا المنتج بعد فتحه.", "الشحن خلال 2–3 أيام."], p: tw(B.open3, closeAll) + tw(B.hidden, B.when), warn: 1 },
      { t: "التقييمات", body: ["★★★★☆ 4.3 من 210 تقييمًا"], p: tw(B.open4, closeAll) },
    ];
  } else if (scene === "plan") {
    title = "باقة الإنترنت";
    secs = [
      { t: "السعر والسرعة", body: ["200 ج.م شهريًا", "سرعة حتى 100 ميجا"], p: tw(B.c1Open, B.c1No) },
      { t: "التركيب", body: ["خلال 3 أيام عمل"], p: 0 },
      { t: "أجهزة الراوتر", body: ["راوتر مجاني"], p: 0 },
      { t: "الشروط الكاملة", body: ["…"], p: 0 },
      { t: "الدعم الفني", body: ["…"], p: 0 },
    ];
  } else if (scene === "checkout") {
    title = "إتمام الطلب";
    const st = f < B.c2Next1 ? 0 : f < B.c2Back ? 1 : f < B.c2Ex ? 0 : f < B.c2Next2 ? 0 : 1;
    const extra = f >= B.c2Next2 ? 1 : 0;
    secs = [
      { t: "1. Shipping address", body: ["القاهرة، شارع النيل 12", "التالي ›"], p: st === 0 && !extra ? 1 : 0, done: f >= B.c2Next1 },
      { t: "2. Delivery & gift options", body: ["توصيل عادي (مجاني)", "تغليف هدية", "التالي ›"], p: st === 1 || extra ? 1 : 0, done: false },
      { t: "3. Payment", body: ["…"], p: 0 },
    ].map((s, i, a) => ({ ...s, p: i === 0 ? tw(B.c2 + 10, B.c2Next1) + tw(B.c2Back, B.c2Next2) : i === 1 ? tw(B.c2Next1, B.c2Back) + enter(f, B.c2Next2, 12) : 0 }));
  } else {
    title = "الأسئلة الشائعة";
    secs = [
      { t: "متى يصل طلبي؟", body: ["خلال 2–3 أيام عمل."], p: 0 },
      { t: "كيف أغيّر عنواني؟", body: ["من صفحة الحساب ثم العناوين."], p: 0 },
      { t: "هل يمكنني إرجاع منتج؟", body: ["نعم خلال 14 يومًا لمعظم المنتجات."], p: tw(B.c3Open, END + 60) },
      { t: "ما طرق الدفع؟", body: ["بطاقة، أو محفظة، أو عند الاستلام."], p: tw(B.c3Open2, END + 60) },
      { t: "هل الشحن مجاني؟", body: ["للطلبات فوق 500 ج.م."], p: 0 },
    ];
  }
  const rs = layout(secs);

  // ---- camera -----------------------------------------------------------------------------
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const push = (at: number): Shot => ({ f: at, s: 1.12, fx: PH.x + PH.w / 2, fy: PH.y, cx: 770, cy: 12 });
  const shots: Shot[] = [{ f: 0, ...overview }, push(B.disc), { f: B.when, ...overview }];
  const cam = cameraAt(f, shots);
  const mode: DebugMode = f < B.split ? "live" : f >= B.c1 ? (f >= B.c1No && f < B.c2 ? "compare" : "inspect") : "inspect";
  const address = scene === "product" ? "shop.app/product" : scene === "plan" ? "shop.app/plans" : scene === "checkout" ? "shop.app/checkout" : "shop.app/help";

  const dim = Math.max(span(f, B.many, B.when), span(f, B.c1Note, B.c2)) * 0.9;

  // ---- pointers ---------------------------------------------------------------------------
  const tapAt = (at: number, r: Rect, dx = -50, dy = 110) => {
    const p = camPoint(mid(r), cameraAt(at, shots));
    return { keys: [{ f: at - 16, x: p.x + dx, y: p.y + dy }, { f: at, ...p, click: true }, { f: at + 14, ...p }] as Key[], from: at - 18, to: at + 22 };
  };
  // header rects at the time of each tap
  const headAt = (i: number, open: number[]) => {
    let y = TOP;
    const bodies = [2, 2, 2, 1];
    for (let k = 0; k < i; k++) y += HEAD + (bodies[k] * LINE + 16) * open[k] + 8;
    return L(14, y, PH.w - 28, HEAD);
  };
  const touches = [
    tapAt(B.open1, headAt(0, [0, 0, 0, 0])), tapAt(B.open2, headAt(1, [1, 0, 0, 0])), tapAt(B.open3, headAt(2, [1, 1, 0, 0])), tapAt(B.open4, headAt(3, [1, 1, 1, 0])),
    tapAt(B.c1Open, L(14, TOP, PH.w - 28, HEAD)),
    tapAt(B.c2Next1, L(28, TOP + HEAD + 8 + LINE, 80, LINE)), tapAt(B.c2Back, L(14, TOP, PH.w - 28, HEAD)), tapAt(B.c2Next2, L(28, TOP + HEAD + 8 + LINE, 80, LINE)),
    tapAt(B.c3Open, L(14, TOP + (HEAD + 8) * 2, PH.w - 28, HEAD)), tapAt(B.c3Open2, L(14, TOP + (HEAD + 8) * 3 + LINE + 16, PH.w - 28, HEAD)),
  ];
  const taps = [B.open1, B.open2, B.open3, B.open4].filter((t) => f >= t).length;

  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      <CaseChip y={40} text="عيوب الـ Accordion" p={span(f, B.split, B.when)} warn />
      <SideNote y={110} text="البيانات مقسّمة: لا تظهر كلها معًا" p={span(f, B.split + 6, B.cost)} warn icon={wi(IconAlert)} />
      <SideNote y={250} text={`لرؤية كل شيء: ${taps} ${taps === 1 ? "ضغطة" : "ضغطات"}`} p={span(f, B.open1, B.cost)} icon={wi(IconHash)} />
      <SideNote y={110} text="Interaction cost أعلى" p={span(f, B.cost, B.disc)} big warn />
      <SideNote y={250} text="ولو احتاج أقسامًا متفرقة، يفتح كلًّا منها" p={span(f, B.cost2, B.disc)} />
      <SideNote y={110} text="ويضرّ الـ Discoverability" p={span(f, B.disc, B.when)} big warn icon={wi(IconEye)} />
      <Selection r={camRect(rs[2]?.head ?? phoneRect, cam)} hover={sel(B.disc + 30, B.when)} selected={sel(B.disc + 30, B.when)} label="مطويّ" />
      <SideNote y={260} text="معلومة مهمة في قسم مطويّ قد لا يكتشفها أبدًا" p={span(f, B.hidden - 30, B.when)} warn />

      <SideNote y={110} text="فمتى يكون الـ Accordion مناسبًا؟" p={span(f, B.when, B.c1)} big />
      <ListCard y={250} p={span(f, B.recapCons, B.c1)} items={[{ text: "يصل للبيانات على أجزاء", p: enter(f, B.recapCons + 6), no: true }, { text: "ورؤيتها كلها تكلّف ضغطات", p: enter(f, B.recapCons + 90), no: true }]} />

      <CaseChip y={40} text="مناسب · 1" p={span(f, B.c1, B.c2)} />
      <SideNote y={110} text="يحتاج الناس جزءًا قليلًا من الصفحة" p={span(f, B.c1 + 6, B.c2)} icon={wi(IconCheck)} />
      <Selection r={camRect(rs[0]?.head ?? phoneRect, cam)} hover={sel(B.c1Open + 10, B.c1No)} selected={sel(B.c1Open + 10, B.c1No)} label="ما يهمّه فقط" />
      <SideNote y={260} text="والباقي مهم أن يكون موجودًا" p={span(f, B.c1Note, B.c2)} />
      <SideNote y={400} text="لا تطوِه حين يحتاجون كل التفاصيل" p={span(f, B.c1No, B.c2)} warn />

      <CaseChip y={40} text="مناسب · 2" p={span(f, B.c2, B.c3)} />
      <SideNote y={110} text="Process خطوة بخطوة: كل خطوة في Accordion" p={span(f, B.c2 + 6, B.c3)} icon={wi(IconLoop)} />
      <SideNote y={260} text="Next يفتح الخطوة التالية" p={span(f, B.c2Next1, B.c3)} />
      <SideNote y={380} text="ويمكنه الرجوع لخطوة سابقة" p={span(f, B.c2Back, B.c3)} />

      <CaseChip y={40} text="مناسب · 3" p={span(f, B.c3, END)} />
      <SideNote y={110} text="محتوى مستقل، كل قسم وحده: مثل FAQ" p={span(f, B.c3 + 6, END)} icon={wi(IconCheck)} />
      <SideNote y={260} text="يتصفّح العناوين ويفتح ما يحتاجه فقط" p={span(f, B.c3Open - 20, END)} />
      <SideNote y={400} text="وهكذا نتجنّب عيوبه" p={span(f, B.c3Avoid, END)} big />

      {touches.map((t, i) => (
        <UserTouch key={i} frame={f} keys={t.keys} from={t.from} to={t.to} />
      ))}
      {scene === "product" && f >= B.hidden - 30 && f < B.when ? <Tag r={camRect({ x: rs[2].body.x, y: rs[2].body.y + rs[2].body.h + 30, w: 0, h: 0 }, cam)} text="لم يُفتح، فلم يُر" tone="warn" progress={span(f, B.hidden - 20, B.hidden)} /> : null}
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={address} illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>
            <Header title={title} back={scene !== "faq"} />
            <Accordion secs={secs} />
          </PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c04/cam.mp4" hide={enter(f, s(2.5 + 163.8), 10)} />
      <TitleBand title="متى تستخدم الـ Accordion؟" sub="Accordion" />
      <Voice src="c04/voice.m4a" />
      <IntroCard title="الـ Accordion: عيوبه، ومتى يناسبك" sub="Accordion" points={["3 عيوب", "3 حالات مناسبة"]} />
      <RecapCard
        voiceSec={VOICE}
        title="اطوِ ما لا يحتاجه أغلب الناس"
        items={[
          { text: "حين يحتاجون جزءًا قليلًا من صفحة طويلة" },
          { text: "لخطوات متتالية، أو أسئلة مستقلة مثل FAQ" },
          { text: "حين يحتاجون كل التفاصيل", no: true },
          { text: "لمعلومة يجب أن يراها الجميع", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
