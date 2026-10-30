import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camRect, camStyle, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, PH, PhoneFrame, Presenter, RecapCard, SideNote, TitleBand, v, Voice, wi } from "./p14";
import { Group, Toggle } from "./ctl";

/*
 * P14-C12 re-edit: WP 5 "toggle switch" (0–192.4 s). A flight app shows that a toggle acts at once, so it does not belong
 * in a search form, then a short direct label, and how On and Off are shown.
 */
const VOICE = 192.43;
export const C12_FRAMES = clipFrames(VOICE);

const Row: React.FC<{ label: string; on: number; left?: string; right?: string; dim?: boolean }> = ({ label, on, left, right, dim }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 52, fontSize: 16, color: C.text, gap: 10, opacity: dim ? 0.5 : 1 }}>
    <span style={{ flex: 1, lineHeight: 1.35 }}>{label}</span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}>
      {left ? <span style={{ color: on < 0.5 ? C.text : C.textMuted }}>{left}</span> : null}
      <Toggle on={on} />
      {right ? <span style={{ color: on > 0.5 ? D.brand : C.textMuted }}>{right}</span> : null}
    </span>
  </div>
);

export const C12: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    intro: v(0.5), flip: v(11.2), digital: v(13.6), bulb: v(18.2), unlike: v(27.8), now: v(36.7), diff: v(42.5),
    search: v(51.1), nearby: v(61.3), tgl: v(65.0), wrong: v(77.3), setting: v(82.0), results: v(89.5), instant: v(93.7),
    label: v(103.4), short: v(107.5), long: v(115.4), neg: v(119.4), shorter: v(125.8),
    state: v(136.9), which: v(140.3), twoStates: v(151.8), sides: v(162.5), beside: v(168.4), color: v(173.0), both: v(182.7), single: v(186.1),
  };
  const END = v(VOICE) + 6;
  type Scene = "intro" | "search" | "label" | "state";
  const scene: Scene = f < B.search ? "intro" : f < B.label ? "search" : f < B.state ? "label" : "state";
  const cuts = [B.search, B.label, B.state];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));

  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [{ f: 0, ...overview }];
  const cam = cameraAt(f, shots);
  const mode: DebugMode = f < B.intro ? "live" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const r = (x: number, y: number, w: number, h: number) => camRect(L(x, y, w, h), cam);
  const dim = Math.max(span(f, B.wrong, B.results), span(f, B.long, B.shorter)) * 0.5;
  const tg = (a: number) => enter(f, a, 8);

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="ghayma.app/flights" illustrative overlay={
        <>
          <FocusDim r={camRect(L(0, 0, PH.w, PH.h), cam)} amount={dim} pad={8} />

          <CaseChip y={40} text="Toggle switch" p={span(f, B.intro, B.search)} />
          <SideNote y={110} text="مفتاح On / Off رقمي" p={span(f, B.digital, B.search)} big icon={wi(IconCheck)} />
          <SideNote y={250} text="مثل مفتاح النور: يتغيّر الشيء لحظة الضغط" p={span(f, B.bulb, B.now)} />
          <SideNote y={390} text="بخلاف Checkbox و Radio: لا زر بعده" p={span(f, B.unlike, B.diff)} icon={wi(IconEye)} />
          <SideNote y={250} text="ينفّذ داخل النظام فورًا" p={span(f, B.now, B.search)} />
          <SideNote y={390} text="وهذا الفرق الأهم بينهما" p={span(f, B.diff, B.search)} />

          <CaseChip y={40} text="1 · الإجراء فوري" p={span(f, B.search, B.label)} />
          <Selection r={r(14, 150, 272, 54)} hover={sel(B.nearby, B.wrong)} selected={sel(B.tgl, B.wrong)} label="مطارات قريبة" />
          <SideNote y={110} text="هل هذا الاستخدام صحيح؟" p={span(f, B.tgl + 40, B.wrong)} icon={wi(IconEye)} />
          <SideNote y={110} text="لا: لا يتغيّر شيء عند الضغط" p={span(f, B.wrong, B.results)} warn icon={wi(IconAlert)} />
          <SideNote y={250} text="هو Setting يظهر أثره بعد البحث" p={span(f, B.setting, B.results)} />
          <SideNote y={110} text="أثره يظهر في صفحة النتائج" p={span(f, B.results, B.label)} />
          <SideNote y={250} text="الـ Toggle أثره لحظي، مثل وضع الطيران" p={span(f, B.instant, B.label)} icon={wi(IconCheck)} />

          <CaseChip y={40} text="2 · Label قصير ومباشر" p={span(f, B.label, B.state)} />
          <SideNote y={110} text="المستخدم يقرأ ما يحتاجه فقط" p={span(f, B.short, B.long)} icon={wi(IconEye)} />
          <SideNote y={110} text="Label طويل وفيه نفي" p={span(f, B.long, B.shorter)} warn icon={wi(IconAlert)} />
          <SideNote y={250} text="يحتاج وقتًا ليقرأه ويفهمه" p={span(f, B.neg, B.shorter)} warn />
          <SideNote y={110} text="Label قصير ومباشر يُفهم أسرع" p={span(f, B.shorter, B.state)} icon={wi(IconCheck)} />

          <CaseChip y={40} text="3 · أي حالة الآن؟" p={span(f, B.state, END)} />
          <SideNote y={110} text="هل أشغّله أم هو شغّال؟" p={span(f, B.which, B.twoStates)} warn icon={wi(IconAlert)} />
          <SideNote y={110} text="اكتب Off و On إن كان العنوان فوق" p={span(f, B.twoStates, B.beside)} icon={wi(IconCheck)} />
          <SideNote y={250} text="Off على جهة، و On على الجهة الأخرى" p={span(f, B.sides, B.beside)} />
          <SideNote y={110} text="أو Label بجانبه، واللون يدل على الحالة" p={span(f, B.beside, B.both)} icon={wi(IconCheck)} />
          <SideNote y={250} text="رمادي = Off، ولون الـ Primary = On" p={span(f, B.color, B.both)} />
          <SideNote y={110} text="لا تكتب Off وحدها أو On وحدها" p={span(f, B.both, END)} warn icon={wi(IconAlert)} />
          <SideNote y={250} text="قد تُفهم أنها Label الـ Toggle" p={span(f, B.single, END)} warn />
        </>
      }>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>
            <Header title="غيمة · الطيران" />

            {scene === "intro" ? (
              <Group title="الإعدادات" top={80}>
                <Row label="الإشعارات" on={tg(B.flip)} />
                {f >= B.now ? <div style={{ fontSize: 14, color: D.brand, fontWeight: 700, opacity: enter(f, B.now, 10) }}>الإشعارات تعمل الآن</div> : null}
              </Group>
            ) : null}

            {scene === "search" ? (
              <>
                <Group title="من - إلى" top={74}>
                  <div style={{ height: 44, borderRadius: 10, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, color: C.text, marginBottom: 8 }}>القاهرة - دبي</div>
                </Group>
                <div style={{ position: "absolute", left: 18, right: 18, top: 150 }}>
                  <Row label="ابحث في المطارات القريبة فقط" on={tg(B.tgl)} />
                </div>
                {f < B.results ? (
                  <div style={{ position: "absolute", left: 18, right: 18, top: 230, height: 46, borderRadius: 12, background: D.brand, color: D.onBrand, fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>بحث</div>
                ) : (
                  <Group title="نتائج البحث" top={230} o={enter(f, B.results, 10)}>
                    <div style={{ fontSize: 16, color: C.text, lineHeight: 1.6 }}>12 رحلة من مطارات قريبة</div>
                  </Group>
                )}
              </>
            ) : null}

            {scene === "label" ? (
              <Group title="التصفية" top={80}>
                {f < B.long ? (
                  <Row label="أمتعة مشمولة" on={tg(B.short)} />
                ) : f < B.shorter ? (
                  <Row label="تضمين الرحلات التي لا تخلو من أمتعة غير مشمولة" on={tg(B.long)} />
                ) : (
                  <Row label="أمتعة مشمولة" on={tg(B.shorter)} />
                )}
              </Group>
            ) : null}

            {scene === "state" ? (
              f < B.beside ? (
                <Group title="عرض الأسعار" top={80}>
                  <Row label="" on={f >= B.sides ? 1 : 0} left={f >= B.twoStates ? "Off" : undefined} right={f >= B.twoStates ? "On" : undefined} />
                </Group>
              ) : (
                <>
                  <Group title="التصفية" top={80}>
                    {f < B.both ? (
                      <Row label="عرض الأسعار شاملة الضريبة" on={f >= B.color + 40 ? 1 : 0} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 52, fontSize: 16, color: C.text }}>
                        <span>الأسعار شاملة الضريبة</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.warning }}>Off<Toggle on={0} /></span>
                      </div>
                    )}
                  </Group>
                </>
              )
            ) : null}
          </PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c12/cam.mp4" />
      <TitleBand title="Toggle switch" sub="Input controls" />
      <Voice src="c12/voice.m4a" />
      <IntroCard title="Toggle switch: أثره فوري" sub="Toggle switch" points={["الفرق عن Checkbox", "Label قصير", "حالة On و Off"]} />
      <RecapCard
        voiceSec={VOICE}
        title="Toggle switch واضح وفوري"
        items={[
          { text: "أثره لحظي، دون زر بعده" },
          { text: "لا يصلح لـ Setting يظهر أثره بعد البحث" },
          { text: "Label قصير ومباشر" },
          { text: "حالة On / Off واضحة" },
        ]}
      />
    </AbsoluteFill>
  );
};
