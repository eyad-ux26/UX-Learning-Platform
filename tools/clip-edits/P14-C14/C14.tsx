import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye, IconSearch, IconText } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { LEFT, Marker, ONE, Panel, R, RIGHT, Small, Verdict } from "./ctl";
import { FBox, FButton, INK, LINE, MUTED } from "./form";
import { D } from "../brand/theme";

/*
 * P14-C14: WP 6 "Input fields", forms part 2 (481.08–668.38 s): avoid placeholder text (the slide's Password field
 * with "Must have at least 6 characters" inside, which disappears on typing; then the same hint as a visible line
 * under the label), floating labels, the search exception, matching the control to the answer (choose a plan: three
 * options as radio buttons, not a drop-down), field size (a wide email field), and required (*) vs optional fields.
 */
const VOICE = 187.3;
const vc = vCut("c14");
const VOICE_CUT = cutSec(VOICE, cutsOf("c14"));
export const C14_FRAMES = clipFrames(VOICE_CUT);

const typed = (full: string, f: number, a: number, cps = 8) => full.slice(0, Math.max(0, Math.min(full.length, Math.floor(((f - a) / 30) * cps))));

export const C14: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    what: vc(11.4), type: vc(22.7), why: vc(29.0), gone: vc(33.5), want: vc(34.1), erase: vc(43.1), fix: vc(49.6), stays: vc(57.4),
    float: vc(61.1), up: vc(67.8), avoid: vc(77.3), search: vc(79.2), notf: vc(86.8), tap: vc(96.1),
    type2: vc(104.2), three: vc(116.1), radio: vc(120.8), many: vc(127.8), size: vc(138.6), wide: vc(143.7),
    req: vc(147.3), star: vc(161.9), opt: vc(170.8), both: vc(176.1),
  };
  const END = vc(VOICE) + 6;
  type Scene = "ph" | "fix" | "float" | "search" | "type" | "size" | "req";
  const scene: Scene = f < B.fix ? "ph" : f < B.float ? "fix" : f < B.search ? "float" : f < B.type2 ? "search" : f < B.size ? "type" : f < B.req ? "size" : "req";
  const cuts = [B.fix, B.float, B.search, B.type2, B.size, B.req];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const mode: DebugMode = scene === "type" || scene === "size" ? "compare" : scene === "ph" && f < B.type ? "live" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const sub = (r: R, dx: number, dy: number, w: number, h: number): R => ({ x: r.x + dx, y: r.y + dy, w, h });

  const PW: R = { x: 450, y: 110, w: 520, h: 330 };
  // placeholder scene: typed until the erase, then wiped
  const pwFull = "••••••••";
  const pwVal = f < B.type ? "" : f < B.erase ? typed(pwFull, f, B.type) : pwFull.slice(0, Math.max(0, pwFull.length - Math.floor((f - B.erase) / 4)));

  // floating label: inside the box until typing starts, then rides up onto the border
  const fl = enter(f, B.up - 20, 14);
  const flVal = f < B.up ? "" : typed("mariam.hassan@mail.com", f, B.up, 10);

  // search: placeholder until the tap
  const q = f < B.tap ? "" : typed("ياسر شمس", f, B.tap + 10, 5);

  // required/optional phases
  const reqPhase = f < B.opt ? "star" : f < B.both ? "opt" : "both";
  const star = (on: boolean) => (on ? <span style={{ color: "#C2410C", marginInlineStart: 4 }}>*</span> : null);
  const optT = (on: boolean) => (on ? <span style={{ color: MUTED, fontWeight: 500, marginInlineStart: 6 }}>(اختياري)</span> : null);

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "ph" ? (
        <Panel r={PW} head="رصيد">
          <Small text="إنشاء كلمة مرور" />
          <div style={{ fontSize: 24, fontWeight: 700, color: INK, margin: "18px 0 8px" }}>كلمة المرور</div>
          <FBox h={56} fs={22} ltr={!!pwVal} value={pwVal || undefined} ph={pwVal ? undefined : "6 أحرف على الأقل"} focus={f >= B.type} caret={f >= B.type && f < B.fix} />
          <div style={{ height: 30 }} />
          <FButton text="متابعة" />
        </Panel>
      ) : null}

      {scene === "fix" ? (
        <Panel r={PW} head="رصيد">
          <Small text="إنشاء كلمة مرور" />
          <div style={{ fontSize: 24, fontWeight: 700, color: INK, margin: "18px 0 4px" }}>كلمة المرور</div>
          <div style={{ fontSize: 20, color: MUTED, marginBottom: 8 }}>6 أحرف على الأقل</div>
          <FBox h={56} fs={22} ltr value={f >= B.stays ? typed(pwFull, f, B.stays) || undefined : undefined} focus={f >= B.stays} />
          <div style={{ height: 22 }} />
          <FButton text="متابعة" />
        </Panel>
      ) : null}

      {scene === "float" ? (
        <Panel r={PW} head="رصيد">
          <Small text="تسجيل الدخول" />
          <div style={{ position: "relative", marginTop: 34 }}>
            <div dir="ltr" style={{ height: 60, borderRadius: 10, border: `2.5px solid ${fl > 0 ? D.brand : LINE}`, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 22, color: INK, boxSizing: "border-box" }}>{flVal}</div>
            <span style={{ position: "absolute", right: 14, top: interpolate(fl, [0, 1], [16, -13]), fontSize: interpolate(fl, [0, 1], [22, 17]), color: fl > 0.5 ? D.brand : MUTED, background: "#FFF", padding: "0 6px", fontWeight: 600 }}>البريد الإلكتروني</span>
          </div>
          <div style={{ height: 30 }} />
          <FButton text="دخول" />
        </Panel>
      ) : null}

      {scene === "search" ? (
        <Panel r={{ x: 430, y: 60, w: 540, h: 360 }} head="رصيد">
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 56, borderRadius: 28, background: "#F1F3F5", padding: "0 18px", marginTop: 10, border: f >= B.tap ? `2.5px solid ${D.brand}` : "2.5px solid transparent" }}>
            <IconSearch color={MUTED} size={24} stroke={2.4} />
            <span style={{ fontSize: 22, color: q ? INK : "#8A929E" }}>{q || "ابحث عن جهة اتصال أو رقم"}</span>
          </div>
          <Small text="الأخيرة" muted />
          {["ياسر شمس", "دينا سعد", "خالد عمر"].map((n) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, height: 52, fontSize: 21 }}>
              <span style={{ width: 38, height: 38, borderRadius: 19, background: D.brandSoft }} />
              {n}
            </div>
          ))}
        </Panel>
      ) : null}

      {scene === "type" ? (
        <>
          <Panel r={LEFT} head="رصيد" dim={span(f, B.radio, B.many) * 0.6}>
            <Small text="اختر الخطة" />
            <FBox select ph="اختر" h={50} />
          </Panel>
          <Panel r={RIGHT} head="رصيد" dim={span(f, B.many, B.size) * 0.6}>
            <Small text="اختر الخطة" />
            {[["مجانية", "0 جنيه أسبوعيًا"], ["مميزة", "15 جنيه أسبوعيًا"], ["بريميوم", "30 جنيه أسبوعيًا"]].map(([a, b], i) => (
              <div key={a} style={{ display: "flex", alignItems: "center", gap: 10, height: 64 }}>
                <Marker kind="radio" on={i === 0 ? 1 : 0} size={26} />
                <div>
                  <div style={{ fontSize: 21, fontWeight: 600 }}>{a}</div>
                  <div style={{ fontSize: 17, color: MUTED }}>{b}</div>
                </div>
              </div>
            ))}
          </Panel>
        </>
      ) : null}

      {scene === "size" ? (
        <>
          <Panel r={{ ...LEFT, h: 260 }} head="رصيد">
            <div style={{ fontSize: 21, fontWeight: 600, marginBottom: 6 }}>البريد الإلكتروني</div>
            <FBox w={150} ltr value="mariam.hass" h={46} />
          </Panel>
          <Panel r={{ ...RIGHT, h: 260 }} head="رصيد" o={enter(f, B.wide, 12)}>
            <div style={{ fontSize: 21, fontWeight: 600, marginBottom: 6 }}>البريد الإلكتروني</div>
            <FBox ltr value="mariam.hassan@mail.com" h={46} fs={18} />
          </Panel>
        </>
      ) : null}

      {scene === "req" ? (
        <Panel r={ONE} head="رصيد">
          <Small text="أخبرنا عن نفسك" />
          {[
            { l: "الاسم الأول", r: true },
            { l: "اسم العائلة", r: true },
            { l: "رقم الموبايل", r: true },
            { l: "اللقب", r: false },
          ].map((x) => (
            <div key={x.l} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 21, fontWeight: 600, color: INK, marginBottom: 4 }}>
                {x.l}
                {star(x.r && reqPhase !== "opt")}
                {optT(!x.r && reqPhase !== "star")}
              </div>
              <FBox h={44} />
            </div>
          ))}
        </Panel>
      ) : null}
    </div>
  );

  const overlay = (
    <>
      <CaseChip y={40} text="5 · تجنّب الـ Placeholder" p={span(f, 0, B.search)} />
      <SideNote w={360} y={110} text="Placeholder: النص داخل الحقل حتى تبدأ الكتابة" p={span(f, B.what - 200, B.type)} big icon={wi(IconText)} />
      <Selection r={sub(PW, 20, 56 + 16 + 42 + 18 + 36 + 8, 480, 56)} hover={sel(B.what, B.type)} selected={sel(B.what + 30, B.type)} label="Placeholder" labelSide="below" />
      <SideNote w={360} y={110} text="أكتب… فيختفي" p={span(f, B.type, B.want)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="أريد أن أقرأ الشرط مرة أخرى" p={span(f, B.want, B.fix)} warn icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="فأمسح كل ما كتبته لأراه" p={span(f, B.erase, B.fix)} warn />
      <SideNote w={360} y={110} text="الشرط فوق الحقل أو تحته" p={span(f, B.fix, B.float)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="يبقى ظاهرًا أثناء الكتابة" p={span(f, B.stays, B.float)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="Floating label: يبدأ داخل الحقل…" p={span(f, B.float, B.up)} icon={wi(IconText)} />
      <SideNote w={360} y={110} text="…ثم يطفو فوقه حين أكتب" p={span(f, B.up, B.avoid)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="الأفضل دائمًا: تجنّب الـ Placeholder" p={span(f, B.avoid, B.search)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="الاستثناء: البحث" p={span(f, B.search, B.type2)} />
      <SideNote w={360} y={110} text="البحث غالبًا مكتوب داخله" p={span(f, B.search, B.notf)} icon={wi(IconSearch)} />
      <SideNote w={360} y={110} text="البحث لا يُعامل كـ Text field في Form" p={span(f, B.notf, B.type2)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={290} text="يختفي النص حين أكتب، ولا مشكلة" p={span(f, B.tap, B.type2)} />

      <CaseChip y={40} text="6 · النوع والحجم المناسبان" p={span(f, B.type2, B.req)} />
      <SideNote w={360} y={110} text="اختر العنصر المناسب لكل إدخال" p={span(f, B.type2, B.three)} big icon={wi(IconCheck)} />
      <Verdict r={LEFT} good={false} p={span(f, B.radio, B.many)} />
      <Verdict r={RIGHT} good p={span(f, B.radio, B.many)} />
      <SideNote w={360} y={110} text="3 اختيارات: Radio buttons أم Dropdown؟" p={span(f, B.three, B.radio)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="اختيارات قليلة: Radio buttons، كلها ظاهرة" p={span(f, B.radio, B.many)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="اختيارات كثيرة أو مساحة قليلة: Dropdown" p={span(f, B.many, B.size)} icon={wi(IconCheck)} />
      <Verdict r={{ ...LEFT, h: 260 }} good={false} p={span(f, B.size + 30, B.req)} />
      <Verdict r={{ ...RIGHT, h: 260 }} good p={span(f, B.wide, B.req)} />
      <SideNote w={360} y={110} text="الحجم: البريد يحتاج حقلًا عريضًا" p={span(f, B.size, B.req)} icon={wi(IconEye)} />

      <CaseChip y={40} text="7 · مطلوب أم اختياري؟" p={span(f, B.req, END)} />
      <SideNote w={360} y={110} text="ما الذي يجب ملؤه لكي أكمل؟" p={span(f, B.req, B.star)} big icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="نجمة بجانب الحقول المطلوبة…" p={span(f, B.star, B.opt)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="…أو «(اختياري)» بجانب الاختيارية" p={span(f, B.opt, B.both)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="الأفضل: الاثنان معًا" p={span(f, B.both, END)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="فيميّز بسهولة، دون تجربة وأخطاء" p={span(f, B.both + 90, END)} />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={scene === "search" ? "raseed.app/transfer" : "raseed.app/signup"} illustrative overlay={overlay}>
        {product}
      </DebuggerShell>
      <Presenter cam="c14/cam.mp4" />
      <TitleBand title="أسماء الحقول وما تحتاجه" sub="Forms" />
      <Voice src="c14/voice.m4a" />
      <IntroCard title="حقل يقول ما يحتاجه" sub="Forms" points={["لا Placeholder", "العنصر والحجم المناسبان", "مطلوب واختياري"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="أسماء ظاهرة، وحقول واضحة"
        items={[
          { text: "الشروط والأسماء خارج الحقل، لا Placeholder" },
          { text: "البحث هو الاستثناء" },
          { text: "Radio buttons لاختيارات قليلة، وحجم يناسب الإجابة" },
          { text: "نجمة للمطلوب و«اختياري» للباقي" },
        ]}
      />
    </AbsoluteFill>
  );
};
