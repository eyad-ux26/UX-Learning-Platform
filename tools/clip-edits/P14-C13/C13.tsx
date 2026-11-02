import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { Selection } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye, IconText } from "../components/Icons";
import { enter, exit, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { LEFT, ONE, Panel, R, RIGHT, Small, Verdict } from "./ctl";
import { FButton, FField, FSection, INK, LINE, MUTED } from "./form";

/*
 * P14-C13: WP 6 "Input fields", forms part 1 (298.4–481.08 s): what forms are for, keep it short (the slide's long
 * sign-up cut to email, password and an optional team size), labels close to their fields (the equidistant
 * "Password" label), sections for different topics, one column (the zig-zag two-column sign-up, then the
 * expiry/CVV exception), and logical sequence (card number, expiry, then turn the card over for the CVV; first name
 * before last name).
 */
const VOICE = 182.68;
const vc = vCut("c13");
const VOICE_CUT = cutSec(VOICE, cutsOf("c13"));
export const C13_FRAMES = clipFrames(VOICE_CUT);

export const C13: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    use: vc(6.0), buy: vc(7.5), short: vc(18.5), list: vc(25.7), later: vc(34.1), need: vc(37.7), cut: vc(39.9),
    group: vc(45.5), pw: vc(52.9), eq: vc(58.2), long: vc(68.1), fix: vc(76.3),
    sec: vc(78.9), split: vc(86.7), ease: vc(90.3), next: vc(95.2),
    col: vc(102.7), zig: vc(110.3), exc: vc(114.3), cvv: vc(121.1), small: vc(124.5), rule: vc(128.7),
    seq: vc(131.6), think: vc(141.0), num: vc(151.6), exp: vc(153.8), flip: vc(155.0), order: vc(157.2), name: vc(168.0), last: vc(172.8),
  };
  const END = vc(VOICE) + 6;
  type Scene = "uses" | "short" | "group" | "sec" | "col" | "seq";
  const scene: Scene = f < B.short ? "uses" : f < B.group ? "short" : f < B.sec ? "group" : f < B.col ? "sec" : f < B.seq ? "col" : "seq";
  const cuts = [B.short, B.group, B.sec, B.col, B.exc, B.seq, B.name];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));
  const mode: DebugMode = scene === "uses" ? "live" : scene === "short" || scene === "sec" || (scene === "col" && f < B.exc) ? "compare" : "inspect";
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const sub = (r: R, dx: number, dy: number, w: number, h: number): R => ({ x: r.x + dx, y: r.y + dy, w, h });
  const gone = (a: number) => 1 - enter(f, a, 14);

  // group scene: label gap animates from "equidistant" (the slide) to "close to its field" (the fix)
  const fixP = enter(f, B.fix, 16);
  const above = 24 - 18 * fixP; // space between a label and its own field
  const between = 24 + 18 * fixP; // space before the next label
  const G = sub(ONE, 0, 0, 520, 470);

  // logical-sequence card drawing (front, then back)
  const flipP = enter(f, B.flip, 12);
  const card = (
    <div dir="ltr" style={{ position: "absolute", left: 60, top: 0, width: 460, height: 270, borderRadius: 24, background: "linear-gradient(135deg, #0E7490, #164E63)", color: "#FFF", boxShadow: "0 16px 36px rgba(0,0,0,0.35)", fontFamily: "IBM Plex Sans Arabic", overflow: "hidden" }}>
      {flipP < 0.5 ? (
        <div style={{ opacity: 1 - flipP * 2 }}>
          <div style={{ position: "absolute", left: 34, top: 40, width: 64, height: 46, borderRadius: 8, background: "#E9C46A" }} />
          <div style={{ position: "absolute", left: 34, top: 120, fontSize: 32, letterSpacing: 2, fontWeight: 600, outline: f >= B.num && f < B.exp ? "3px dashed #78E4FC" : undefined, outlineOffset: 8, borderRadius: 6 }}>4012 8888 1881 1234</div>
          <div style={{ position: "absolute", left: 34, top: 186, fontSize: 16, opacity: 0.8 }}>VALID THRU</div>
          <div style={{ position: "absolute", left: 34, top: 206, fontSize: 28, fontWeight: 600, outline: f >= B.exp && f < B.flip ? "3px dashed #78E4FC" : undefined, outlineOffset: 6, borderRadius: 6 }}>09/29</div>
        </div>
      ) : (
        <div style={{ opacity: flipP * 2 - 1 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 40, height: 60, background: "#0B1F2A" }} />
          <div style={{ position: "absolute", left: 34, top: 130, width: 280, height: 46, background: "#F4F4F4", borderRadius: 4 }} />
          <div style={{ position: "absolute", left: 330, top: 130, width: 96, height: 46, background: "#FFF", color: INK, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, outline: f < B.order + 30 ? "3px dashed #78E4FC" : undefined, outlineOffset: 6 }}>731</div>
          <div style={{ position: "absolute", left: 330, top: 186, fontSize: 18, opacity: 0.85 }}>CVV</div>
        </div>
      )}
    </div>
  );
  const CARDR: R = { x: 420, y: 20, w: 580, h: 280 };
  const PAY: R = { x: 480, y: 316, w: 460, h: 230 };

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "uses" ? (
        <>
          <Panel r={LEFT} head="رصيد">
            <Small text="تسجيل الدخول" />
            <FField label="البريد الإلكتروني" ltr />
            <FField label="كلمة المرور" ltr />
            <FButton text="دخول" />
          </Panel>
          <Panel r={RIGHT} head="رصيد" o={enter(f, B.buy, 12)}>
            <Small text="طريقة الدفع" />
            <FField label="رقم البطاقة" ltr />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 2 }}><FField label="تاريخ الانتهاء" ltr ph="MM/YY" /></div>
              <div style={{ flex: 1 }}><FField label="CVV" ltr /></div>
            </div>
            <FField label="الاسم على البطاقة" />
          </Panel>
        </>
      ) : null}

      {scene === "short" ? (
        <>
          <Panel r={LEFT} head="رصيد" dim={span(f, B.cut + 20, B.group) * 0.5}>
            <Small text="إنشاء حساب" />
            <FField label="الاسم الأول" o={0.35 + 0.65 * gone(B.cut)} gap={6} h={38} />
            <FField label="اسم العائلة" o={0.35 + 0.65 * gone(B.cut)} gap={6} h={38} />
            <FField label="البريد الإلكتروني" gap={6} h={38} ltr />
            <FField label="كلمة المرور" gap={6} h={38} ltr />
            <FField label="الشركة" o={0.35 + 0.65 * gone(B.cut)} gap={6} h={38} />
          </Panel>
          <Panel r={RIGHT} head="رصيد" o={enter(f, B.cut, 14)}>
            <Small text="إنشاء حساب" />
            <FField label="البريد الإلكتروني" ltr />
            <FField label="كلمة المرور" ltr />
            <FField label="حجم الفريق" note="اختياري" select />
            <FButton text="أنشئ الحساب" />
          </Panel>
        </>
      ) : null}

      {scene === "group" ? (
        <Panel r={G} head="رصيد">
          <Small text="إنشاء حساب" />
          {[
            { l: "البريد الإلكتروني", ltr: true },
            { l: "كلمة المرور", ltr: true },
            { l: "حجم الفريق", note: "اختياري", select: true },
          ].map((x, i) => (
            <div key={x.l} style={{ marginTop: i ? between : 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, fontWeight: 600, color: INK, marginBottom: above }}>
                <span>{x.l}</span>
                {x.note ? <span style={{ fontSize: 18, color: MUTED }}>{x.note}</span> : null}
              </div>
              <div style={{ height: 50, borderRadius: 10, border: `1.5px solid ${LINE}`, display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "0 12px", color: MUTED }}>{x.select ? "▾" : ""}</div>
            </div>
          ))}
        </Panel>
      ) : null}

      {scene === "sec" ? (
        <>
          <Panel r={{ ...LEFT, y: 30, h: 580 }} head="رصيد" dim={span(f, B.split + 10, B.col) * 0.5}>
            {["الاسم بالكامل", "رقم الموبايل", "العنوان", "رقم البطاقة", "تاريخ الانتهاء", "الاسم على البطاقة"].map((t) => (
              <FField key={t} label={t} gap={3} h={32} />
            ))}
          </Panel>
          <Panel r={{ ...RIGHT, y: 30, h: 580 }} head="رصيد" o={enter(f, B.split, 14)}>
            <FSection text="البيانات الشخصية" />
            {["الاسم بالكامل", "رقم الموبايل", "العنوان"].map((t) => <FField key={t} label={t} gap={3} h={32} />)}
            <div style={{ height: 8 }} />
            <FSection text="بيانات الدفع" />
            {["رقم البطاقة", "تاريخ الانتهاء", "الاسم على البطاقة"].map((t) => <FField key={t} label={t} gap={3} h={32} />)}
          </Panel>
        </>
      ) : null}

      {scene === "col" ? (
        f < B.exc ? (
          <>
            <Panel r={{ x: 405, y: 76, w: 582, h: 300 }} head="رصيد" o={1 - enter(f, B.zig + 60, 14)}>
              <div style={{ display: "flex", gap: 18 }}>
                <div style={{ flex: 1 }}>
                  {["الاسم الأول", "اسم العائلة", "رقم الموبايل"].map((t) => <FField key={t} label={t} gap={6} h={36} />)}
                </div>
                <div style={{ flex: 1 }}>
                  {["البريد الإلكتروني", "كلمة المرور", "تأكيد كلمة المرور"].map((t) => <FField key={t} label={t} gap={6} h={36} />)}
                </div>
              </div>
            </Panel>
            {/* the eye's zig-zag: down the first column, back up, down the second */}
            <svg style={{ position: "absolute", left: 405, top: 76, width: 582, height: 300, opacity: enter(f, B.zig - 40, 14) * (1 - enter(f, B.zig + 60, 14)) }}>
              <path d="M 560 90 L 560 280 L 270 90 L 270 280" fill="none" stroke="#E8A93A" strokeWidth={4} strokeDasharray="10 8" strokeDashoffset={-(f % 60)} />
            </svg>
            <Panel r={{ x: 560, y: 60, w: 330, h: 520 }} head="رصيد" o={enter(f, B.zig + 60, 14)}>
              {["الاسم الأول", "اسم العائلة", "رقم الموبايل", "البريد الإلكتروني", "كلمة المرور", "تأكيد كلمة المرور"].map((t) => <FField key={t} label={t} gap={4} h={34} />)}
            </Panel>
          </>
        ) : (
          <Panel r={ONE} head="رصيد">
            <Small text="طريقة الدفع" />
            <FField label="رقم البطاقة" ltr ph="0000 0000 0000 0000" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 2 }}><FField label="تاريخ الانتهاء" ltr ph="MM/YY" /></div>
              <div style={{ flex: 1 }}><FField label="CVV" ltr ph="123" /></div>
            </div>
            <FField label="الاسم على البطاقة" />
            <FButton text="ادفع" />
          </Panel>
        )
      ) : null}

      {scene === "seq" ? (
        f < B.name ? (
          <>
            <div style={{ position: "absolute", left: CARDR.x, top: CARDR.y, width: CARDR.w, height: CARDR.h }}>{card}</div>
            <Panel r={PAY}>
              <FField label="1 · رقم البطاقة" ltr value={f >= B.exp ? "4012 8888 1881 1234" : undefined} focus={f >= B.num && f < B.exp} gap={8} h={40} />
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 2 }}><FField label="2 · الانتهاء" ltr value={f >= B.flip ? "09/29" : undefined} focus={f >= B.exp && f < B.flip} h={40} /></div>
                <div style={{ flex: 1 }}><FField label="3 · CVV" ltr value={f >= B.order + 30 ? "731" : undefined} focus={f >= B.flip && f < B.order + 30} h={40} /></div>
              </div>
            </Panel>
          </>
        ) : (
          <Panel r={ONE} head="رصيد">
            <Small text="إنشاء حساب" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><FField label="1 · الاسم الأول" value={f >= B.last ? "مريم" : undefined} focus={f < B.last} /></div>
              <div style={{ flex: 1 }}><FField label="2 · اسم العائلة" value={f >= B.last + 40 ? "حسن" : undefined} focus={f >= B.last && f < B.last + 40} /></div>
            </div>
            <FField label="البريد الإلكتروني" ltr />
          </Panel>
        )
      ) : null}
    </div>
  );

  const overlay = (
    <>
      <CaseChip y={40} text="Forms" p={span(f, 0, B.short)} />
      <SideNote w={360} y={110} text="Forms: أكثر مكان نستخدم فيه الـ Text fields" p={span(f, B.use - 60, B.short)} big icon={wi(IconText)} />
      <SideNote w={360} y={270} text="الشراء، وتسجيل الدخول، وإدخال البيانات" p={span(f, B.buy, B.short)} />

      <CaseChip y={40} text="1 · اجعله قصيرًا" p={span(f, B.short, B.group)} />
      <Verdict r={LEFT} good={false} p={span(f, B.cut, B.group)} />
      <Verdict r={RIGHT} good p={span(f, B.cut + 10, B.group)} />
      <SideNote w={360} y={110} text="Keep it short" p={span(f, B.short, B.list)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="اكتب كل البيانات التي تريد جمعها" p={span(f, B.list, B.later)} icon={wi(IconText)} />
      <SideNote w={360} y={110} text="هل يمكن أخذها لاحقًا؟" p={span(f, B.later, B.cut)} icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="هل هي ضرورية الآن؟" p={span(f, B.need, B.cut)} />
      <SideNote w={360} y={110} text="احذف ما تستطيع حذفه" p={span(f, B.cut, B.group)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="2 · الاسم قريب من حقله" p={span(f, B.group, B.sec)} />
      <Selection r={{ x: G.x + G.w - 230, y: G.y + 243, w: 210, h: 36 }} hover={sel(B.pw, B.fix)} selected={sel(B.pw + 20, B.fix)} label="Password" labelSide="below" />
      <SideNote w={360} y={110} text="«كلمة المرور» تبعد عن الحقلين بالمسافة نفسها" p={span(f, B.eq, B.fix)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={290} text="في Form طويل قد تبدو نصًّا مساعدًا للحقل الأول" p={span(f, B.long, B.fix)} warn />
      <SideNote w={360} y={110} text="قرّب اسم الحقل من حقله" p={span(f, B.fix, B.sec)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="2 · أقسام للمواضيع المختلفة" p={span(f, B.sec, B.col)} />
      <SideNote w={360} y={110} text="بيانات مختلفة؟ قسّمها Sections" p={span(f, B.sec, B.ease)} big icon={wi(IconText)} />
      <SideNote w={360} y={110} text="يفهم كل قسم عن ماذا يتكلم" p={span(f, B.ease, B.col)} icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="ينهي قسمًا ثم ينتقل للتالي" p={span(f, B.next, B.col)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="3 · عمود واحد" p={span(f, B.col, B.seq)} />
      <SideNote w={360} y={110} text="الحقول تحت بعضها أفضل من عمودين" p={span(f, B.col, B.exc)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={290} text="العمودان يقطعان النزول الطبيعي لأسفل" p={span(f, B.zig, B.exc)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="الاستثناء: حقول مرتبطة منطقيًا" p={span(f, B.exc, B.seq)} icon={wi(IconEye)} />
      <Selection r={{ x: ONE.x + 20, y: ONE.y + 56 + 16 + 38 + 82 + 14, w: 480, h: 84 }} hover={sel(B.cvv, B.seq)} selected={sel(B.cvv + 20, B.seq)} label="الانتهاء والـ CVV" labelSide="below" />
      <SideNote w={360} y={250} text="CVV رقم قصير، فيجلس بجانب تاريخ الانتهاء" p={span(f, B.small, B.seq)} />

      <CaseChip y={40} text="4 · ترتيب منطقي" p={span(f, B.seq, END)} />
      <SideNote w={360} y={110} text="Logical sequence: من أين يأخذ البيانات؟" p={span(f, B.seq, B.num)} big icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="الرقم، ثم تاريخ الانتهاء، ثم يقلب البطاقة للـ CVV" p={span(f, B.num, B.name)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="الاسم الأول، ثم اسم العائلة" p={span(f, B.name, END)} icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="هل يوجد منطق يفرض ترتيبًا؟" p={span(f, B.last + 60, END)} />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={scene === "seq" || (scene === "col" && f >= B.exc) || scene === "uses" ? "raseed.app/checkout" : "raseed.app/signup"} illustrative overlay={overlay}>
        {product}
      </DebuggerShell>
      <Presenter cam="c13/cam.mp4" />
      <TitleBand title="نماذج قصيرة ومرتبة" sub="Forms" />
      <Voice src="c13/voice.m4a" />
      <IntroCard title="Form يكمله الناس" sub="Forms" points={["قصير", "اسم الحقل قريب منه", "عمود واحد", "ترتيب منطقي"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="Form قصير بمسار واحد"
        items={[
          { text: "احذف ما لا تحتاجه الآن" },
          { text: "اسم كل حقل قريب منه، وأقسام للمواضيع" },
          { text: "عمود واحد، إلا للحقول المرتبطة" },
          { text: "رتّب الحقول كما يجد الناس البيانات" },
        ]}
      />
    </AbsoluteFill>
  );
};
