import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye, IconText, IconUndo } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, ListCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { LEFT, Panel, R, RIGHT, Small, Verdict } from "./ctl";
import { ERR, FBox, FButton, FField, INK, MUTED } from "./form";
import { D } from "../brand/theme";

/*
 * P14-C15: WP 6 "Input fields", forms part 3 (668.38–793.16 s): state input requirements before people type (the
 * slide's change-password form that only lists the password rules as an error after submitting), avoid Reset and
 * Clear (the complaint form; one wrong tap wipes everything), a Cancel button kept lower in the hierarchy, and highly
 * visible, specific errors (the email field: outline, icon and message), tied back to the heuristic on recognising,
 * diagnosing and recovering from errors.
 */
const VOICE = 124.78;
const vc = vCut("c15");
const VOICE_CUT = cutSec(VOICE, cutsOf("c15"));
export const C15_FRAMES = clipFrames(VOICE_CUT);

const RULES = ["8 أحرف على الأقل", "حرف كبير (Capital) واحد على الأقل", "رمز خاص واحد على الأقل، مثل ! أو #"];

export const C15: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    pwd: vc(9.9), caps: vc(14.4), before: vc(19.9), err: vc(21.6), always: vc(25.5),
    reset: vc(33.9), wipe: vc(37.4), rare: vc(40.5), oops: vc(42.5), none: vc(53.5), sens: vc(58.1), cancel: vc(69.7), lower: vc(75.5),
    error: vc(82.7), specific: vc(90.4), icon: vc(94.5), border: vc(98.3), msg: vc(101.9), heur: vc(106.6), where: vc(115.2), what: vc(117.6), recover: vc(121.3),
  };
  const END = vc(VOICE) + 6;
  type Scene = "rules" | "reset" | "error";
  const scene: Scene = f < B.reset ? "rules" : f < B.error ? "reset" : "error";
  const cuts = [B.always, B.reset, B.sens, B.error];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const mode: DebugMode = scene === "reset" && f >= B.sens ? "compare" : scene === "rules" && f < B.pwd ? "live" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const sub = (r: R, dx: number, dy: number, w: number, h: number): R => ({ x: r.x + dx, y: r.y + dy, w, h });

  const P: R = { x: 440, y: 30, w: 530, h: 570 };
  const wiped = scene === "reset" && f >= B.oops + 20 && f < B.sens;
  const tapOn = f >= B.oops && f < B.oops + 20;
  const filled = (v: string) => (wiped ? undefined : v);

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "rules" ? (
        <Panel r={P} head="رصيد">
          <Small text="تغيير كلمة المرور" />
          {f < B.always ? (
            <>
              <FField label="كلمة المرور الجديدة" ltr value={f >= B.pwd ? "••••••" : undefined} error={f >= B.err ? "يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، منها حرف كبير ورمز خاص" : undefined} />
              <FField label="أعد كتابة كلمة المرور" ltr />
              <FButton text="حفظ" />
            </>
          ) : (
            <>
              <div style={{ fontSize: 19, fontWeight: 600, color: INK, marginBottom: 4 }}>كلمة المرور الجديدة</div>
              <div style={{ marginBottom: 8 }}>
                {RULES.map((r, i) => (
                  <div key={r} style={{ fontSize: 18, color: MUTED, display: "flex", gap: 8, alignItems: "center", opacity: enter(f, B.always + 8 + i * 8, 10) }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: D.brand }} />
                    {r}
                  </div>
                ))}
              </div>
              <FBox ltr focus />
              <div style={{ height: 12 }} />
              <FField label="أعد كتابة كلمة المرور" ltr />
              <FButton text="حفظ" />
            </>
          )}
        </Panel>
      ) : null}

      {scene === "reset" ? (
        f < B.sens ? (
          <Panel r={P} head="رصيد">
            <Small text="تقديم شكوى" />
            <FField label="الاسم" value={filled("مريم حسن")} gap={6} h={38} />
            <FField label="البريد الإلكتروني" ltr value={filled("mariam.hassan@mail.com")} gap={6} h={38} />
            <FField label="نوع الشكوى" select value={filled("تحويل لم يصل")} gap={6} h={38} />
            <FField label="التفاصيل" value={filled("أرسلت 500 جنيه أمس ولم تصل…")} h={52} gap={12} />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, height: 50, borderRadius: 12, background: tapOn ? "#94A3B8" : "#CBD5E1", color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>مسح</div>
              <div style={{ flex: 1 }}><FButton text="إرسال" /></div>
            </div>
          </Panel>
        ) : (
          <>
            <Panel r={LEFT} head="رصيد">
              <Small text="تقديم شكوى" />
              {["الاسم", "البريد الإلكتروني", "التفاصيل"].map((t) => <FField key={t} label={t} gap={8} h={38} />)}
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1 }}><FButton text="إلغاء" h={46} fs={19} /></div>
                <div style={{ flex: 1 }}><FButton text="إرسال" h={46} fs={19} /></div>
              </div>
            </Panel>
            <Panel r={RIGHT} head="رصيد" o={enter(f, B.lower, 12)}>
              <Small text="تقديم شكوى" />
              {["الاسم", "البريد الإلكتروني", "التفاصيل"].map((t) => <FField key={t} label={t} gap={8} h={38} />)}
              <div style={{ marginTop: 6 }}><FButton text="إرسال" h={46} fs={19} /></div>
              <div style={{ textAlign: "center", fontSize: 19, fontWeight: 600, color: D.brand, marginTop: 12 }}>إلغاء</div>
            </Panel>
          </>
        )
      ) : null}

      {scene === "error" ? (
        <Panel r={P} head="رصيد">
          <Small text="إنشاء حساب" />
          <div style={{ fontSize: 21, fontWeight: 600, color: INK, marginBottom: 6 }}>البريد الإلكتروني</div>
          <FBox ltr value="mariam.hassan@gmail" h={54} fs={21} err={f >= B.border} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, minHeight: 30, fontSize: 20, fontWeight: 600, color: ERR }}>
            {f >= B.icon ? <span>⚠</span> : null}
            {f >= B.specific ? <span>أكمل البريد الإلكتروني، مثل mariam@gmail.com</span> : null}
          </div>
          <div style={{ height: 18 }} />
          <FField label="كلمة المرور" ltr value="••••••••" />
          <FButton text="أنشئ الحساب" />
        </Panel>
      ) : null}
    </div>
  );

  const overlay = (
    <>
      <CaseChip y={40} text="8 · اذكر الشروط من البداية" p={span(f, 0, B.reset)} />
      <SideNote w={360} y={110} text="هل للإدخال شروط معيّنة؟" p={span(f, 0, B.pwd)} big icon={wi(IconText)} />
      <SideNote w={360} y={110} text="مثل كلمة المرور: حرف كبير، رمز خاص…" p={span(f, B.pwd, B.err)} icon={wi(IconText)} />
      <Selection r={sub(P, 20, 56 + 16 + 42 + 29 + 42, 490, 60)} hover={sel(B.err, B.always)} selected={sel(B.err + 20, B.always)} label="الشروط بعد الخطأ" labelSide="below" />
      <SideNote w={360} y={110} text="لا تتركه يكتب ثم تقول له: خطأ" p={span(f, B.err, B.always)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="اعرض الشروط قبل أن يبدأ الكتابة" p={span(f, B.always, B.reset)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={290} text="وتبقى ظاهرة وهو يكتب" p={span(f, B.always + 60, B.reset)} icon={wi(IconEye)} />

      <CaseChip y={40} text="9 · لا Reset ولا Clear" p={span(f, B.reset, B.error)} />
      <SideNote w={360} y={110} text="زر «مسح» يحذف كل ما كتبه" p={span(f, B.wipe, B.rare)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="نادرًا ما يُستخدم…" p={span(f, B.rare, B.oops)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="…وغالبًا يُضغط بالخطأ" p={span(f, B.oops, B.sens)} warn icon={wi(IconUndo)} />
      <SideNote w={360} y={290} text="لا تستخدم Reset أو Clear" p={span(f, B.none, B.sens)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="بيانات حساسة؟ أضف «إلغاء» ليتأكد أنها حُذفت" p={span(f, B.sens, B.lower)} icon={wi(IconCheck)} />
      <Verdict r={LEFT} good={false} p={span(f, B.lower, B.error)} />
      <Verdict r={RIGHT} good p={span(f, B.lower, B.error)} />
      <SideNote w={360} y={110} text="لكن بأولوية أقل من زر الإرسال" p={span(f, B.lower, B.error)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="10 · خطأ واضح ومحدد" p={span(f, B.error, END)} />
      <SideNote w={360} y={110} text="إذا حدث خطأ، اجعله واضحًا جدًا" p={span(f, B.error, B.icon)} big icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="رسالة، ورمز، وإطار ملوّن" p={span(f, B.icon, B.heur)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="الرسالة تقول ما الخطأ بالضبط" p={span(f, B.msg, B.heur)} icon={wi(IconText)} />
      <ListCard
        w={360}
        y={110}
        title="Usability heuristic"
        p={span(f, B.heur, END)}
        items={[
          { text: "Recognize: أين الخطأ", p: enter(f, B.where, 10) },
          { text: "Diagnose: ما هو بالضبط", p: enter(f, B.what, 10) },
          { text: "Recover: كيف أصلحه", p: enter(f, B.recover, 10) },
        ]}
      />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={scene === "reset" ? "raseed.app/support" : "raseed.app/signup"} illustrative overlay={overlay}>
        {product}
      </DebuggerShell>
      <Presenter cam="c15/cam.mp4" />
      <TitleBand title="الشروط والأخطاء والخروج" sub="Forms" />
      <Voice src="c15/voice.m4a" />
      <IntroCard title="أخطاء يسهل إصلاحها" sub="Forms" points={["الشروط أولًا", "لا Reset", "خطأ واضح ومحدد"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="امنع الخطأ، وسهّل إصلاحه"
        items={[
          { text: "اعرض الشروط قبل الكتابة" },
          { text: "لا Reset ولا Clear؛ و«إلغاء» أهدأ من «إرسال»" },
          { text: "رسالة محددة بجانب الحقل، مع رمز وإطار" },
        ]}
      />
    </AbsoluteFill>
  );
};
