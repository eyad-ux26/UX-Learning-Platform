import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { D, PRODUCT_FONT } from "../brand/theme";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { SelectionOn } from "../debugger/Inspect";
import { IconAlert, IconCheck, IconEye, IconGrid, IconTarget } from "../components/Icons";
import { enter, span } from "../lib/timeline";
import { CaseChip, clipFrames, cutSec, cutsOf, IntroCard, ListCard, Presenter, RecapCard, SideNote, TitleBand, vCut, Voice, wi } from "./p14";
import { LEFT, ONE, Panel, R, RIGHT, Small, Verdict } from "./ctl";
import { FBox, FButton, INK, LINE, MUTED } from "./form";

/*
 * P14-C19: WP 16 "Chips" (0–320.59 s), following the trainer's slides: definition (a small interactive element for a
 * piece of information or a task, as in a "share your experience" screen); usage (many chips together in one area, such
 * as movie times or email recipients, while buttons stay at 1 to 3 per screen with different types); the four types:
 * assist (a restaurant page whose chips open the maps app or the calendar), filter (chips under a search that apply at
 * once; an image site's filters), input (an applied "Vectors" filter or typed email recipients, removed with a tap) and
 * suggestion (related words in a translator; smart replies in a chat); guidelines (chips come as a group, a single main
 * action is a button; steps forward or back such as Save, Cancel, Post or Publish are buttons).
 */
const VOICE = 320.59;
const vc = vCut("c19");
const VOICE_CUT = cutSec(VOICE, cutsOf("c19"));
export const C19_FRAMES = clipFrames(VOICE_CUT);

/** One chip. `on` = selected filter (✓), `x` = input chip (✕), `icon` = leading glyph, `tap` = 0..1 tap ring. */
const Chip: React.FC<{ text: string; on?: boolean; x?: boolean; icon?: string; o?: number; tap?: number; fs?: number; color?: string; soft?: string }> = ({ text, on, x, icon, o = 1, tap = 0, fs = 19, color, soft }) => (
  <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 7, height: 42, padding: x ? "0 10px 0 14px" : "0 15px", borderRadius: 10, border: `1.5px solid ${on ? "transparent" : x ? "transparent" : LINE}`, background: on ? soft ?? D.brandSoft : x ? "#EEF0F3" : "#FFFFFF", color: on ? color ?? D.brand : INK, fontSize: fs, fontWeight: 600, whiteSpace: "nowrap", opacity: o, boxSizing: "border-box", flexShrink: 0 }}>
    {on ? <span style={{ fontSize: fs - 2 }}>✓</span> : icon ? <span style={{ fontSize: fs - 1, color: color ?? D.brand }}>{icon}</span> : null}
    <span>{text}</span>
    {x ? <span style={{ fontSize: fs - 5, color: MUTED, width: 22, height: 22, borderRadius: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>✕</span> : null}
    {tap > 0 && tap < 1 ? <span style={{ position: "absolute", inset: -6, borderRadius: 14, border: `3px solid ${color ?? D.brand}`, opacity: 1 - tap, scale: String(0.92 + 0.22 * tap) }} /> : null}
  </span>
);

const Chips: React.FC<{ children: React.ReactNode; gap?: number; mb?: number; wrap?: boolean; sel?: string }> = ({ children, gap = 8, mb = 14, wrap = true, sel }) => (
  <div data-sel={sel} style={{ display: "flex", flexWrap: wrap ? "wrap" : "nowrap", gap, marginBottom: mb, alignItems: "center" }}>{children}</div>
);

/** A panel with its own coloured header, for a second app shown next to the scene's product. */
const AppPanel: React.FC<{ r: R; name: string; color: string; o?: number; children: React.ReactNode }> = ({ r, name, color, o = 1, children }) =>
  o <= 0 ? null : (
    <div dir="rtl" style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, opacity: o, translate: `${(1 - o) * 30}px 0px`, borderRadius: 22, overflow: "hidden", background: "#FFFFFF", boxShadow: "0 16px 36px rgba(0,0,0,0.35)", fontFamily: PRODUCT_FONT, color: INK }}>
      <div style={{ height: 56, background: color, color: "#FFFFFF", display: "flex", alignItems: "center", padding: "0 20px", fontSize: 21, fontWeight: 700 }}>{name}</div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );

const Photo: React.FC<{ h: number; a: string; b: string; label?: string }> = ({ h, a, b, label }) => (
  <div style={{ height: h, borderRadius: 14, background: `linear-gradient(135deg, ${a}, ${b})`, display: "flex", alignItems: "flex-end", padding: 12, boxSizing: "border-box", color: "#FFFFFF", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{label}</div>
);

export const C19: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    small: vc(3.0), data: vc(5.9), task: vc(9.06), diff: vc(13.72),
    usage: vc(15.76), many: vc(17.64), btns: vc(24.0), max3: vc(28.44), types: vc(31.38), chipsGrp: vc(39.84), mail: vc(43.96), chip1: vc(49.2), tapRm: vc(51.9), add2: vc(58.18), chip2: vc(61.6), big: vc(64.1),
    four: vc(68.24), list: vc(74.0),
    assist: vc(83.42), between: vc(85.6), rest: vc(89.96), maps: vc(92.68), tapMaps: vc(98.76), cal: vc(103.7), tapCal: vc(110.36), link: vc(117.3),
    filter: vc(124.7), under: vc(128.28), tapF: vc(139.54), popular: vc(148.92), site: vc(156.64), tapSite: vc(162.14),
    input: vc(164.86), shows: vc(172.92), what: vc(174.7), remove: vc(179.66), tapV: vc(187.54), gone: vc(189.28), mail2: vc(192.34), type2: vc(197.6), enter2: vc(199.5), tapRm2: vc(207.32), rm2: vc(209.46),
    sugg: vc(215.72), context: vc(221.32), trans: vc(223.72), related: vc(226.68), tapW: vc(232.02), ctx: vc(235.96), chat: vc(240.08), tapReply: vc(245.2), all: vc(248.46),
    guide: vc(251.06), group: vc(254.04), single: vc(266.8), main: vc(278.7), btn: vc(283.8), relatedAct: vc(287.36), best: vc(293.3),
    flow: vc(297.14), post: vc(302.62), chipsUse: vc(312.82),
  };
  const END = vc(VOICE) + 6;
  type Scene = "def" | "times" | "btns" | "mail" | "types" | "assist" | "filter" | "site" | "mail2" | "trans" | "chat" | "guide" | "flow";
  const scene: Scene =
    f < B.usage ? "def" : f < B.btns ? "times" : f < B.chipsGrp ? "btns" : f < B.four ? "mail" : f < B.assist ? "types" : f < B.filter ? "assist" : f < B.site ? "filter" : f < B.mail2 ? "site" : f < B.sugg ? "mail2" : f < B.chat ? "trans" : f < B.guide ? "chat" : f < B.flow ? "guide" : "flow";
  const cuts = [B.usage, B.btns, B.chipsGrp, B.four, B.assist, B.filter, B.site, B.mail2, B.sugg, B.chat, B.guide, B.single, B.flow];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? 1 - (f - (c - 8)) / 8 : f >= c && f < c + 10 ? (f - c) / 10 : 1)));
  const tap = (a: number) => (f >= a && f < a + 18 ? (f - a) / 18 : 0);
  const typed = (t: string, a: number, per = 5) => (f < a ? "" : t.slice(0, Math.floor((f - a) / per) + 1));
  const sel = (a: number, b: number) => enter(f, a, 10) * (f < b - 8 ? 1 : Math.max(0, (b - f) / 8));
  const address: Record<Scene, string> = {
    def: "lokma.app/review", times: "tazkara.app/movie", btns: "shop.app/product", mail: "mail.app/compose", types: "chips.guide/types", assist: "lokma.app/place",
    filter: "shop.app/search", site: "suwar.com/search", mail2: "mail.app/compose", trans: "kalima.app", chat: "chat.app/dina", guide: "lokma.app/review", flow: "lokma.app/review",
  };
  const mode: DebugMode = scene === "def" || scene === "times" || scene === "assist" || scene === "trans" || scene === "chat" ? "live" : scene === "guide" && f >= B.single ? "compare" : "inspect";

  // ---- shared screens -------------------------------------------------------------------------
  const reviewChips = (o = 1) => (
    <Chips sel="chipsrow">
      <Chip icon="＋" text="أضف صورًا" o={o} />
      <Chip icon="＋" text="أضف أطباقًا" o={o} />
      <Chip icon="☆" text="قيّم المكان" o={o} />
    </Chips>
  );
  const composer = (bottom: React.ReactNode, chips = true) => (
    <>
      <Small text="شارك تجربتك" />
      <div style={{ fontSize: 18, color: MUTED, marginBottom: 12 }}>بيت الكشري · وسط البلد</div>
      <div style={{ height: 120, borderRadius: 12, border: `1.5px solid ${LINE}`, padding: 12, fontSize: 19, color: INK, lineHeight: 1.5, marginBottom: 14, boxSizing: "border-box" }}>كشري ممتاز والخدمة سريعة، والمكان نظيف.</div>
      {chips ? reviewChips() : null}
      {bottom}
    </>
  );

  // mail To field: [Dina] [Yasser] typing…
  const mailTo = (list: { n: string; tap?: number; o?: number }[], typing: string, caret: boolean) => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minHeight: 58, borderBottom: `1.5px solid ${LINE}`, padding: "8px 0" }}>
        <span style={{ fontSize: 19, color: MUTED, width: 34 }}>إلى</span>
        {list.map((c) => (
          <Chip key={c.n} text={c.n} x tap={c.tap} o={c.o} />
        ))}
        <span style={{ fontSize: 20, color: INK }}>
          {typing}
          {caret ? <span style={{ display: "inline-block", width: 2, height: 22, background: D.brand, verticalAlign: "middle", marginInlineStart: 2 }} /> : null}
        </span>
      </div>
      <div style={{ borderBottom: `1.5px solid ${LINE}`, padding: "14px 0", fontSize: 19, color: MUTED }}>الموضوع: خطة الأسبوع</div>
      <div style={{ padding: "14px 0", fontSize: 19, color: INK, lineHeight: 1.6 }}>أهلًا جميعًا، هذه خطة الأسبوع القادم…</div>
    </>
  );

  // mail (usage): Dina is there; Yasser is typed and becomes a chip; Dina is removed; Salma is typed and added
  const dinaGone = f >= B.tapRm + 18;
  const mailList = [
    ...(dinaGone ? [] : [{ n: "دينا", tap: tap(B.tapRm) }]),
    ...(f >= B.chip1 ? [{ n: "ياسر" }] : []),
    ...(f >= B.chip2 ? [{ n: "سلمى" }] : []),
  ];
  const mailTyping = f < B.chip1 ? typed("ياسر", B.mail + 20, 9) : f >= B.add2 && f < B.chip2 ? typed("سلمى", B.add2 + 10, 9) : "";

  // mail2 (input): type "Hossam", Enter turns it into a chip; tapping it removes it
  const h2chip = f >= B.enter2;
  const h2gone = f >= B.tapRm2 + 18;
  const mail2List = [{ n: "ياسر" }, { n: "سلمى" }, ...(h2chip && !h2gone ? [{ n: "حسام", tap: tap(B.tapRm2) }] : [])];

  // filters
  const saleOn = f >= B.tapF;
  const vecOn = f >= B.tapSite && f < B.tapV + 18;
  const vecApplied = f >= B.shows && f < B.tapV + 18;
  const tiles = (vec: boolean) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
      {[0, 1, 2, 3, 4, 5].map((i) =>
        vec ? (
          <div key={i} style={{ height: 96, borderRadius: 12, background: ["#FDE68A", "#BFDBFE", "#DDD6FE", "#FBCFE8", "#A7F3D0", "#FED7AA"][i], display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: i % 2 ? 22 : 8, background: ["#B45309", "#1D4ED8", "#6D28D9", "#BE185D", "#047857", "#C2410C"][i], rotate: `${i * 15}deg` }} />
          </div>
        ) : (
          <div key={i} style={{ height: 96, borderRadius: 12, background: `linear-gradient(${120 + i * 30}deg, #6B4F3A, #C9A27E)` }} />
        ),
      )}
    </div>
  );

  // translator
  const word = f >= B.tapW + 10 ? "glad" : "happy";
  const meaning = f >= B.tapW + 10 ? "مسرور" : "سعيد";
  const replied = f >= B.tapReply + 14;

  const product = (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {scene === "def" ? (
        <Panel r={ONE} head="لقمة">
          {composer(<FButton text="انشر" />)}
        </Panel>
      ) : null}

      {scene === "times" ? (
        <Panel r={ONE} head="تذكرة">
          <Photo h={150} a="#0F4C81" b="#5B8DB8" label="رحلة إلى القمر · 2 س 10 د" />
          <Small text="اختر موعد العرض · الجمعة" />
          <Chips>
            {["1:30 م", "4:00 م", "6:45 م", "9:15 م"].map((t, i) => (
              <Chip key={t} text={t} on={i === 2 && f >= B.many + 20} tap={i === 2 ? tap(B.many + 20) : 0} o={enter(f, B.usage + i * 4, 10)} />
            ))}
          </Chips>
          <FButton text="اختر المقاعد" />
        </Panel>
      ) : null}

      {scene === "btns" ? (
        <Panel r={ONE} head="سوق لين">
          <Photo h={170} a="#F9A8D4" b="#FDE68A" label="حذاء رياضي خفيف" />
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>حذاء رياضي خفيف</div>
          <div style={{ fontSize: 20, color: MUTED, marginBottom: 18 }}>1,450 جنيه</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <FButton text="اشترِ الآن" o={enter(f, B.btns + 10, 10)} />
            <FButton text="أضف إلى السلة" plain o={enter(f, B.max3, 10)} />
            <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: D.brand, opacity: enter(f, B.max3 + 20, 10) }}>احفظ لوقت لاحق</div>
          </div>
        </Panel>
      ) : null}

      {scene === "mail" ? (
        <Panel r={ONE} head="بريدي · رسالة جديدة">
          {mailTo(mailList, mailTyping, f >= B.mail)}
        </Panel>
      ) : null}

      {scene === "types" ? (
        <Panel r={{ x: 430, y: 120, w: 560, h: 300 }}>
          <Small text="أنواع الـ Chips" muted />
          <div dir="ltr" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 30, justifyItems: "center" }}>
            {[
              { el: <Chip icon="📅" text="Assist" />, n: 1 },
              { el: <Chip on text="Filter" />, n: 2 },
              { el: <Chip x text="Input" />, n: 3 },
              { el: <Chip text="Suggestion" />, n: 4 },
            ].map((c, i) => (
              <div key={c.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: enter(f, B.list + i * 24, 10) }}>
                {c.el}
                <span style={{ width: 36, height: 36, borderRadius: 18, background: INK, color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>{c.n}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {scene === "assist" ? (
        <>
          <Panel r={LEFT} head="لقمة">
            <Photo h={130} a="#B45309" b="#FBBF24" label="بيت الكشري" />
            <div style={{ fontSize: 19, color: MUTED, marginBottom: 12 }}>4.6 ★ · 1,240 تقييم</div>
            <Chips gap={8}>
              <Chip icon="➚" text="الاتجاهات" tap={tap(B.tapMaps)} o={enter(f, B.maps, 10)} />
              <Chip icon="▦" text="أضف إلى التقويم" tap={tap(B.tapCal)} o={enter(f, B.cal + 20, 10)} />
            </Chips>
            <div style={{ fontSize: 18, color: MUTED, lineHeight: 1.5 }}>كشري، فطير، وحلويات مصرية. مفتوح حتى 1 صباحًا.</div>
          </Panel>
          <AppPanel r={RIGHT} name="درب · الخرائط" color="#2E7D32" o={span(f, B.tapMaps + 14, B.cal + 10)}>
            <div style={{ position: "relative", height: 300, borderRadius: 14, background: "#E8F0E3", overflow: "hidden", marginBottom: 12 }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 120, height: 18, background: "#FFFFFF" }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: 90, width: 18, background: "#FFFFFF" }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: 180, width: 12, background: "#FFFFFF", rotate: "20deg" }} />
              <div style={{ position: "absolute", left: 140, top: 70, width: 34, height: 34, borderRadius: "17px 17px 17px 0", rotate: "-45deg", background: "#B45309" }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>بيت الكشري</div>
            <div style={{ fontSize: 18, color: MUTED }}>12 دقيقة بالسيارة</div>
          </AppPanel>
          <AppPanel r={RIGHT} name="موعد · التقويم" color="#7C3AED" o={enter(f, B.tapCal + 14, 12)}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>الخميس 14 نوفمبر</div>
            {["6:00 م · النادي", "8:00 م · عشاء في بيت الكشري", "10:00 م · مكالمة مع ماما"].map((t, i) => (
              <div key={t} style={{ fontSize: 19, padding: "12px 12px", marginBottom: 8, borderRadius: 10, background: i === 1 ? "#EFE7FD" : "#F5F6F8", color: i === 1 ? "#5B21B6" : INK, fontWeight: i === 1 ? 700 : 500, borderInlineStart: i === 1 ? "5px solid #7C3AED" : undefined }}>{t}</div>
            ))}
          </AppPanel>
        </>
      ) : null}

      {scene === "filter" ? (
        <Panel r={ONE} head="سوق لين">
          <FBox value="حذاء رياضي" />
          <div style={{ height: 12 }} />
          <Chips>
            <Chip text="مقاس 42" />
            <Chip text="خصم" on={saleOn} tap={tap(B.tapF)} />
            <Chip text="توصيل مجاني" />
            <Chip text="أبيض" />
          </Chips>
          <div style={{ fontSize: 18, color: MUTED, marginBottom: 10 }}>{saleOn ? "23 نتيجة" : "128 نتيجة"}</div>
          {[0, 1].map((i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 84, height: 84, borderRadius: 12, background: ["#FBCFE8", "#BFDBFE"][i] }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{["حذاء جري", "حذاء مشي"][i]}</div>
                <div style={{ fontSize: 19, color: saleOn ? "#B45309" : MUTED, fontWeight: saleOn ? 700 : 500 }}>{saleOn ? ["990 جنيه · خصم 30%", "1,120 جنيه · خصم 20%"][i] : ["1,450 جنيه", "1,400 جنيه"][i]}</div>
              </div>
            </div>
          ))}
        </Panel>
      ) : null}

      {scene === "site" ? (
        <Panel r={ONE} head="صُوَر">
          <FBox value="قهوة" />
          <div style={{ height: 12 }} />
          {f >= B.shows && f < B.tapV + 18 ? (
            <div style={{ marginBottom: 12, opacity: enter(f, B.shows, 10) }}>
              <div style={{ fontSize: 17, color: MUTED, marginBottom: 6 }}>الفلاتر المطبّقة</div>
              <Chips mb={0}>
                <Chip text="Vectors" x tap={tap(B.tapV)} />
              </Chips>
            </div>
          ) : (
            <Chips>
              <Chip text="صور" />
              <Chip text="Vectors" on={vecOn} tap={tap(B.tapSite)} />
              <Chip text="أيقونات" />
              <Chip text="فيديو" />
            </Chips>
          )}
          {tiles(vecOn || vecApplied)}
        </Panel>
      ) : null}

      {scene === "mail2" ? (
        <Panel r={ONE} head="بريدي · رسالة جديدة">
          {mailTo(mail2List, f >= B.type2 && !h2chip ? typed("حسام", B.type2 - 30, 9) : "", true)}
          <div style={{ fontSize: 18, color: MUTED, opacity: span(f, B.type2 - 20, B.enter2 + 20) }}>
            اضغط <span dir="ltr" style={{ border: `1.5px solid ${LINE}`, borderRadius: 6, padding: "2px 8px", color: INK, fontWeight: 700 }}>Enter ↵</span>
          </div>
        </Panel>
      ) : null}

      {scene === "trans" ? (
        <Panel r={ONE} head="كلمة · ترجمة">
          <div dir="ltr" style={{ display: "flex", justifyContent: "space-between", fontSize: 18, color: MUTED, marginBottom: 10 }}>
            <span>English</span>
            <span>⇄</span>
            <span>العربية</span>
          </div>
          <div dir="ltr" style={{ borderRadius: 12, border: `1.5px solid ${LINE}`, padding: 16, fontSize: 30, fontWeight: 600, marginBottom: 10 }}>{word}</div>
          <div style={{ borderRadius: 12, background: D.brandSoft, padding: 16, fontSize: 30, fontWeight: 700, color: D.brand, marginBottom: 18 }}>{meaning}</div>
          <div style={{ opacity: enter(f, B.related, 12) }}>
            <Small text="كلمات قريبة" muted />
            <div dir="ltr">
              <Chips>
                {["glad", "cheerful", "joyful", "pleased"].map((w, i) => (
                  <Chip key={w} text={w} tap={i === 0 ? tap(B.tapW) : 0} />
                ))}
              </Chips>
            </div>
          </div>
        </Panel>
      ) : null}

      {scene === "chat" ? (
        <Panel r={ONE} head="حكاوي · دينا">
          <div style={{ height: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10 }}>
            <div style={{ alignSelf: "flex-start", background: "#F1F2F5", borderRadius: 16, padding: "12px 16px", fontSize: 20, maxWidth: 340 }}>خلّصت الملف أخيرًا 🎉</div>
            <div style={{ alignSelf: "flex-start", background: "#F1F2F5", borderRadius: 16, padding: "12px 16px", fontSize: 20, maxWidth: 340 }}>هنتقابل بكرة الساعة 7؟</div>
            {replied ? <div style={{ alignSelf: "flex-end", background: D.brand, color: "#FFF", borderRadius: 16, padding: "12px 16px", fontSize: 20, opacity: enter(f, B.tapReply + 14, 8) }}>أكيد، أشوفك</div> : null}
          </div>
          <div style={{ height: 14 }} />
          {!replied ? (
            <Chips>
              {["تمام", "أكيد، أشوفك", "خليها 8؟"].map((t, i) => (
                <Chip key={t} text={t} tap={i === 1 ? tap(B.tapReply) : 0} o={enter(f, B.chat + 30 + i * 6, 10)} />
              ))}
            </Chips>
          ) : (
            <div style={{ height: 56 }} />
          )}
          <FBox ph="اكتب رسالة…" />
        </Panel>
      ) : null}

      {scene === "guide" ? (
        f < B.single ? (
          <Panel r={ONE} head="لقمة">
            {composer(<FButton text="انشر" />)}
          </Panel>
        ) : (
          <>
            <Panel r={LEFT} head="لقمة" dim={span(f, B.btn, B.flow) * 0.6}>
              <Small text="شارك تجربتك" />
              <div style={{ height: 150, borderRadius: 12, border: `1.5px solid ${LINE}`, padding: 12, fontSize: 18, lineHeight: 1.5, marginBottom: 14, boxSizing: "border-box" }}>كشري ممتاز والخدمة سريعة.</div>
              <Chips>
                <Chip text="انشر" />
              </Chips>
            </Panel>
            <Panel r={RIGHT} head="لقمة">
              <Small text="شارك تجربتك" />
              <div style={{ height: 150, borderRadius: 12, border: `1.5px solid ${LINE}`, padding: 12, fontSize: 18, lineHeight: 1.5, marginBottom: 14, boxSizing: "border-box" }}>كشري ممتاز والخدمة سريعة.</div>
              <div style={{ opacity: enter(f, B.relatedAct, 12) }}>
                <Chips gap={6}>
                  <Chip icon="＋" text="صور" fs={18} />
                  <Chip icon="＋" text="أطباق" fs={18} />
                </Chips>
              </div>
              <FButton text="انشر" o={enter(f, B.main, 12)} />
            </Panel>
          </>
        )
      ) : null}

      {scene === "flow" ? (
        <Panel r={ONE} head="لقمة">
          {composer(
            <div data-sel="btnrow" style={{ display: "flex", gap: 12 }}>
              <FButton text="إلغاء" plain w="40%" />
              <FButton text="انشر" w="60%" />
            </div>,
          )}
        </Panel>
      ) : null}
    </div>
  );

  const overlay = (
    <>
      <CaseChip y={40} text="ما الـ Chip؟" p={span(f, 0, B.usage)} />
      <SideNote w={360} y={110} text="Chip: عنصر صغير تفاعلي" p={span(f, B.small, B.usage)} big icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="يعرض معلومة، أو ينفّذ مهمة" p={span(f, B.data, B.usage)} />
      <SideNote w={360} y={390} text="يشبه الـ Button… فما الفرق؟" p={span(f, B.diff, B.usage)} />
      <SelectionOn target="chipsrow" hover={sel(B.small, B.data)} selected={sel(B.data, B.usage)} label="Chips" labelSide="left" />

      <CaseChip y={40} text="الاستخدام" p={span(f, B.usage, B.four)} />
      <SideNote w={360} y={110} text="عدة Chips في المكان نفسه" p={span(f, B.many, B.btns)} big icon={wi(IconGrid)} />
      <SideNote w={360} y={250} text="مثل مواعيد عرض فيلم" p={span(f, B.many + 30, B.btns)} />
      <SideNote w={360} y={110} text="الـ Buttons: واحد أو اثنان، وثلاثة على الأكثر" p={span(f, B.btns, B.chipsGrp)} icon={wi(IconAlert)} warn />
      <SideNote w={360} y={250} text="بأنواع مختلفة، ليظهر الأهم" p={span(f, B.types, B.chipsGrp)} />
      <SideNote w={360} y={110} text="Chips: مجموعة في المكان نفسه" p={span(f, B.chipsGrp, B.tapRm)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={250} text="أكتب الاسم فيصبح Chip" p={span(f, B.mail + 30, B.tapRm)} />
      <SideNote w={360} y={110} text="أضغط ✕ لأحذف شخصًا" p={span(f, B.tapRm, B.add2)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="ويمكن أن تكثر في مكان واحد" p={span(f, B.add2, B.four)} icon={wi(IconGrid)} />
      <SideNote w={360} y={250} text="أهم فرق بينها وبين الـ Button" p={span(f, B.big, B.four)} big />

      <CaseChip y={40} text="4 أنواع" p={span(f, B.four, B.assist)} />
      <ListCard
        w={360}
        y={110}
        p={span(f, B.list, B.assist)}
        items={[
          { text: "Assist", p: enter(f, B.list, 10) },
          { text: "Filter", p: enter(f, B.list + 24, 10) },
          { text: "Input", p: enter(f, B.list + 48, 10) },
          { text: "Suggestion", p: enter(f, B.list + 72, 10) },
        ]}
      />

      <CaseChip y={40} text="1 · Assist chips" p={span(f, B.assist, B.filter)} />
      <SideNote w={360} y={110} text="تنقلني إلى تطبيق آخر لإجراء معيّن" p={span(f, B.between, B.link)} big icon={wi(IconTarget)} />
      <SideNote w={360} y={260} text="الاتجاهات ← تطبيق الخرائط" p={span(f, B.tapMaps, B.cal)} />
      <SideNote w={360} y={260} text="أضف إلى التقويم ← التقويم" p={span(f, B.tapCal, B.link)} />
      <SideNote w={360} y={110} text="تربط بين التطبيقات" p={span(f, B.link, B.filter)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="2 · Filter chips" p={span(f, B.filter, B.input)} />
      <SideNote w={360} y={110} text="تحت البحث، أو في صفحة منتجات" p={span(f, B.under, B.tapF)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="أضغط Chip: يُطبَّق الفلتر فورًا" p={span(f, B.tapF, B.popular)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="من أشهر عناصر الفلاتر، خاصة على الموبايل" p={span(f, B.popular, B.site)} icon={wi(IconGrid)} />
      <SideNote w={360} y={110} text="موقع صور: الفلاتر Chips أيضًا" p={span(f, B.site, B.input)} icon={wi(IconEye)} />

      <CaseChip y={40} text="3 · Input chips" p={span(f, B.input, B.sugg)} />
      <SideNote w={360} y={110} text="الفلتر المطبّق يظهر Input chip" p={span(f, B.shows, B.what)} icon={wi(IconEye)} />
      <SideNote w={360} y={110} text="Input chip: شيء أدخلته أنا" p={span(f, B.what, B.mail2)} big icon={wi(IconCheck)} />
      <SideNote w={360} y={260} text="أضغطه لأزيله" p={span(f, B.remove, B.mail2)} />
      <SideNote w={360} y={110} text="أكتب الاسم ثم Enter: يصبح Chip" p={span(f, B.type2, B.tapRm2)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="أضغطه فيُحذف" p={span(f, B.tapRm2, B.sugg)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="4 · Suggestion chips" p={span(f, B.sugg, B.guide)} />
      <SideNote w={360} y={110} text="تقترح إجراءات تخصّ ما أفعله الآن" p={span(f, B.sugg + 60, B.tapW)} big icon={wi(IconTarget)} />
      <SideNote w={360} y={110} text="كلمات قريبة من الكلمة التي أترجمها" p={span(f, B.tapW, B.chat)} icon={wi(IconEye)} />
      <SideNote w={360} y={250} text="اقتراحات مرتبطة بالسياق" p={span(f, B.ctx, B.chat)} />
      <SideNote w={360} y={110} text="ردود مقترحة على الرسالة" p={span(f, B.chat + 30, B.guide)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="إرشادات" p={span(f, B.guide, END)} />
      <SideNote w={360} y={110} text="الـ Chips تأتي مجموعة في مكان واحد" p={span(f, B.group, B.single)} big icon={wi(IconGrid)} />
      <SelectionOn target="chipsrow" hover={sel(B.group, B.all)} selected={sel(B.all, B.single)} label="مجموعة" labelSide="left" />
      <SideNote w={360} y={110} text="Chip واحدة لإجراء واحد؟ هذه Button" p={span(f, B.single, B.main)} warn icon={wi(IconAlert)} />
      <SideNote w={360} y={110} text="إجراء رئيسي واحد = Button" p={span(f, B.main, B.relatedAct)} big icon={wi(IconCheck)} />
      <Verdict r={LEFT} good={false} p={span(f, B.btn, B.flow)} />
      <Verdict r={RIGHT} good p={span(f, B.btn, B.flow)} />
      <SideNote w={360} y={110} text="إجراءات مترابطة في مكان واحد = Chips" p={span(f, B.relatedAct, B.flow)} big icon={wi(IconGrid)} />

      <SideNote w={360} y={110} text="خطوة للأمام أو للخلف (حفظ، إلغاء) = Button" p={span(f, B.flow, B.post)} icon={wi(IconCheck)} />
      <SideNote w={360} y={110} text="إجراء رئيسي مثل «انشر» = Button" p={span(f, B.post, B.chipsUse)} big icon={wi(IconCheck)} />
      <SelectionOn target="btnrow" hover={sel(B.flow, B.post)} selected={sel(B.post, B.chipsUse)} label="Buttons" labelSide="below" />
      <SideNote w={360} y={110} text="Chips: لأنواعها الأربعة" p={span(f, B.chipsUse, END)} big icon={wi(IconGrid)} />
      <SelectionOn target="chipsrow" hover={0} selected={sel(B.chipsUse, END)} label="Chips" labelSide="left" />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={address[scene]} illustrative={scene !== "types"} overlay={overlay}>
        {product}
      </DebuggerShell>
      <Presenter cam="c19/cam.mp4" />
      <TitleBand title="الـ Chips" sub="Chips" />
      <Voice src="c19/voice.m4a" />
      <IntroCard title="متى أستخدم Chips؟" sub="Chips" points={["مجموعة في مكان واحد", "4 أنواع", "Chip أم Button؟"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="Chips لمجموعة خيارات مترابطة"
        items={[
          { text: "عدة Chips معًا في مكان واحد" },
          { text: "Assist، Filter، Input، Suggestion" },
          { text: "الـ Input chip يُحذف بضغطة" },
          { text: "إجراء رئيسي أو خطوة في التدفّق: Button" },
        ]}
      />
    </AbsoluteFill>
  );
};
