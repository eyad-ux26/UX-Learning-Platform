import React from "react";
import { C, CONTENT, D, FONT, T } from "../brand/theme";
import { IconCheck, IconClock, IconComment, IconFilm, IconImage, IconSend, IconSpark, IconText, IconUndo } from "../components/Icons";
import { Rect } from "../debugger/camera";

/*
 * Iterative Refinement episode: an AI writing assistant, first as a chat (old way), then as a document with
 * paragraph comments and version history (new way). Generic, illustrative UI (always with «مثال توضيحي»);
 * it does not reproduce any real product's screens. Geometry is exported for the debugger overlays.
 */
const W = CONTENT.w;
const SIDE = 28;
const AI_ACCENT = "#C2643C"; // assistant avatar colour (neutral warm tone, not a brand mark)

const Avatar: React.FC<{ size?: number; ai?: boolean; letter?: string }> = ({ size = 48, ai, letter = "ن" }) => (
  <span style={{ width: size, height: size, borderRadius: size / 2, flexShrink: 0, background: ai ? AI_ACCENT : "#DCE7F7", color: ai ? "#FFFFFF" : "#2A4A7A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.46, fontWeight: 700 }}>
    {ai ? <IconSpark color="#FFFFFF" size={size * 0.56} stroke={2.4} /> : letter}
  </span>
);

const Caret: React.FC<{ on: boolean; h?: number }> = ({ on, h = 40 }) => (
  <span style={{ display: "inline-block", width: 3, height: h, background: D.brand, opacity: on ? 1 : 0, verticalAlign: "middle", marginInline: 2 }} />
);

/* ------------------------------------------------------------------ chat (the old way) */
export const EMAIL_V1 = [
  "حضرة الأستاذ/ كريم المحترم،",
  "تحية طيبة وبعد،",
  "يسعدني أن أتواصل مع سيادتكم بخصوص",
  "ترتيبات مراجعة التصميم الخاصة بمشروعكم،",
  "وأرجو أن تكون الترتيبات التالية مناسبة لكم:",
  "المراجعة يوم الخميس الساعة 11 صباحًا،",
  "وسأرسل رابط الاجتماع قبلها بيوم.",
  "مع خالص التحية، نور",
];
export const EMAIL_V2 = [
  "أهلاً كريم،",
  "إزيك؟",
  "حبيت أكلمك بخصوص",
  "مراجعة التصميم بتاعة المشروع،",
  "ودي الترتيبات اللي اتفقنا عليها:",
  "المراجعة يوم الخميس الساعة 11 صباحًا،",
  "وسأرسل رابط الاجتماع قبلها بيوم.",
  "مع خالص التحية، نور",
];
const CH = { cardY: 176, lineH: 48, pad: 22, bubbleY: 628, inputY: 904 };
export const emailCardRect: Rect = { x: SIDE, y: CH.cardY, w: W - SIDE * 2, h: CH.pad * 2 + 8 * CH.lineH + 44 };
export const lineRect = (i: number): Rect => ({ x: SIDE + 20, y: CH.cardY + 44 + CH.pad + i * CH.lineH, w: W - SIDE * 2 - 40, h: CH.lineH });
export const linesRect = (a: number, b: number): Rect => ({ ...lineRect(a), h: (b - a + 1) * CH.lineH });
export const chatBubbleRect: Rect = { x: SIDE, y: CH.bubbleY, w: 700, h: 120 };
export const chatInputRect: Rect = { x: SIDE, y: CH.inputY, w: W - SIDE * 2, h: 84 };

export type ChatState = {
  input: string;
  caret: boolean;
  bubble: string; // last instruction sent
  bubbleP: number;
  v2: number; // 0..1 the whole email rewritten
  rewriting: number; // 0..1 "writing" shimmer on the card
};

export const ChatView: React.FC<{ s: ChatState }> = ({ s }) => (
  <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.surface, fontFamily: FONT, color: C.text }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 84, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, padding: "0 32px", fontSize: 32, fontWeight: 700 }}>
      <Avatar size={46} ai /> مساعد الكتابة · محادثة
    </div>
    {/* first request */}
    <div style={{ position: "absolute", top: 100, left: SIDE, maxWidth: 760, padding: "14px 22px", borderRadius: 22, background: C.surfaceAlt, fontSize: 28, color: C.textMuted }}>
      اكتب إيميل لكريم عن موعد مراجعة التصميم
    </div>
    {/* the email the assistant wrote */}
    <div style={{ position: "absolute", top: emailCardRect.y, right: SIDE, width: emailCardRect.w, height: emailCardRect.h, borderRadius: T.radius.md, border: `2px solid ${C.border}`, boxSizing: "border-box", background: C.surface, overflow: "hidden" }}>
      <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", fontSize: 24, color: C.textMuted, borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt }}>
        <Avatar size={28} ai /> {s.v2 > 0.5 ? "اتكتب الإيميل كله من جديد" : "إيميل · موعد مراجعة التصميم"}
      </div>
      {[EMAIL_V1, EMAIL_V2].map((lines, k) => (
        <div key={k} style={{ position: "absolute", top: 44 + CH.pad, right: 20, left: 20, opacity: k === 0 ? 1 - s.v2 : s.v2 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ height: CH.lineH, display: "flex", alignItems: "center", fontSize: 31, whiteSpace: "nowrap" }}>{l}</div>
          ))}
        </div>
      ))}
      {s.rewriting > 0 ? (
        <div style={{ position: "absolute", inset: "44px 0 0 0", background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(241,242,245,${0.9 * s.rewriting}) 50%, rgba(255,255,255,0) 100%)` }} />
      ) : null}
    </div>
    {/* instruction bubble */}
    {s.bubbleP > 0 ? (
      <div style={{ position: "absolute", top: chatBubbleRect.y, left: SIDE, maxWidth: chatBubbleRect.w, padding: "16px 24px", borderRadius: 22, background: "#E7EDF8", fontSize: 30, lineHeight: 1.45, opacity: s.bubbleP, translate: `0px ${(1 - s.bubbleP) * 14}px` }}>
        {s.bubble}
      </div>
    ) : null}
    {/* input */}
    <div style={{ position: "absolute", top: chatInputRect.y, right: SIDE, width: chatInputRect.w, height: chatInputRect.h, borderRadius: 26, border: `2px solid ${C.border}`, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "0 24px", fontSize: 25, overflow: "hidden" }}>
      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", color: s.input ? C.text : C.textSubtle }}>
        {s.input || "اكتب للمساعد…"}
        <Caret on={s.caret} h={34} />
      </span>
      <span style={{ width: 52, height: 52, borderRadius: 26, background: s.input ? D.brand : C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IconSend color={s.input ? D.onBrand : C.textSubtle} size={28} />
      </span>
    </div>
  </div>
);

/* ------------------------------------------------------------------ document (the new way) */
export const P1_FORMAL = "حضرة الأستاذ/ كريم المحترم، تحية طيبة وبعد، يسعدني أن أتواصل مع سيادتكم بخصوص ترتيبات مراجعة التصميم الخاصة بمشروعكم.";
export const P1_SIMPLE = "أهلاً كريم، إزيك؟ حبيت أكلمك بخصوص مراجعة التصميم بتاعة المشروع.";
export const P1_HAND = "أهلاً يا كريم، إزيك؟ حبيت أكلمك بخصوص مراجعة التصميم بتاعة المشروع.";
const P2_TEXT = "المراجعة يوم الخميس الساعة 11 صباحًا، وسأرسل رابط الاجتماع قبلها بيوم.";
const P3_TEXT = "مع خالص التحية، نور";
const DOC = { top: 96, subjH: 70, p1H: 190, p2H: 128, p3H: 64, gap: 18, sheetH: 420 };
const pX = SIDE + 28;
export const docP1: Rect = { x: pX, y: DOC.top + DOC.subjH, w: W - pX * 2, h: DOC.p1H };
export const docP2: Rect = { x: pX, y: docP1.y + DOC.p1H + DOC.gap, w: W - pX * 2, h: DOC.p2H };
export const docP3: Rect = { x: pX, y: docP2.y + DOC.p2H + DOC.gap, w: W - pX * 2, h: DOC.p3H };
export const sheetRect: Rect = { x: 0, y: CONTENT.h - DOC.sheetH, w: W, h: DOC.sheetH };
export const commentInputRect: Rect = { x: SIDE + 8, y: sheetRect.y + 150, w: W - SIDE * 2 - 16, h: 92 };
export const replyRect: Rect = { x: SIDE + 8, y: sheetRect.y + 258, w: W - SIDE * 2 - 16, h: 140 };
export const historyRowRect = (i: number): Rect => ({ x: SIDE, y: sheetRect.y + 92 + i * 100, w: W - SIDE * 2, h: 92 });
export const historyBtn: Rect = { x: SIDE + 8, y: 18, w: 60, h: 60 };

export type DocState = {
  p1: "formal" | "simple" | "hand";
  p1T: number; // 0..1 crossfade to the current p1 text (from the previous one)
  p1Prev: "formal" | "simple" | "hand";
  sel: number; // selection highlight on P1
  changed: number; // green "edited" wash on P1
  caret: boolean; // manual editing caret in P1
  sheet: "none" | "comment" | "history";
  sheetP: number;
  comment: string; // typed comment
  reply: number; // 0..1 assistant reply in the thread
  histSel: number; // highlighted history row (index), -1 none
  p2Flag: number; // closing question: P2 might need a matching change
  pressHistory: number;
};
const P1_TEXTS = { formal: P1_FORMAL, simple: P1_SIMPLE, hand: P1_HAND };

const Para: React.FC<{ r: Rect; children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ r, children, size = 34, style }) => (
  <div style={{ position: "absolute", top: r.y, right: W - r.x - r.w, width: r.w, height: r.h, fontSize: size, lineHeight: 1.6, ...style }}>{children}</div>
);

export const DocView: React.FC<{ s: DocState }> = ({ s }) => (
  <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.surfaceAlt, fontFamily: FONT, color: C.text }}>
    {/* app bar */}
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 84, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 700 }}>
        <IconText color={C.text} size={34} /> إيميل لكريم · مسودة
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <IconComment color={C.textMuted} size={36} />
        <span style={{ display: "flex", padding: 8, borderRadius: 14, background: `rgba(14,124,107,${0.15 * s.pressHistory})` }}>
          <IconClock color={s.sheet === "history" && s.sheetP > 0.5 ? D.brand : C.textMuted} size={38} />
        </span>
      </span>
    </div>
    {/* page */}
    <div style={{ position: "absolute", top: DOC.top - 4, left: SIDE, right: SIDE, bottom: -40, background: C.surface, borderRadius: "20px 20px 0 0", boxShadow: "0 4px 18px rgba(23,26,33,0.06)" }} />
    <Para r={{ x: pX, y: DOC.top + 12, w: W - pX * 2, h: 48 }} size={28} style={{ color: C.textMuted }}>الموضوع: موعد مراجعة التصميم</Para>
    {/* P1 */}
    <div style={{ position: "absolute", top: docP1.y - 6, right: W - docP1.x - docP1.w - 10, width: docP1.w + 20, height: docP1.h + 12, borderRadius: 12, background: s.changed > 0 ? `rgba(43,138,62,${0.10 * s.changed})` : "transparent" }} />
    <Para r={docP1}>
      <span style={{ position: "absolute", inset: 0, opacity: 1 - s.p1T }}>
        <span style={{ background: s.sel > 0 ? `rgba(79,70,229,${0.16 * s.sel})` : "transparent", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{P1_TEXTS[s.p1Prev]}</span>
      </span>
      <span style={{ position: "absolute", inset: 0, opacity: s.p1T }}>
        <span style={{ background: s.sel > 0 ? `rgba(79,70,229,${0.16 * s.sel})` : "transparent", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{P1_TEXTS[s.p1]}</span>
        {s.caret ? <Caret on h={40} /> : null}
      </span>
    </Para>
    <Para r={docP2}>{P2_TEXT}</Para>
    <Para r={docP3} style={{ color: C.textMuted }}>{P3_TEXT}</Para>

    {/* bottom sheet: comment thread or version history */}
    {s.sheet !== "none" && s.sheetP > 0 ? (
      <div style={{ position: "absolute", left: 0, right: 0, top: sheetRect.y + (1 - s.sheetP) * (DOC.sheetH + 30), height: DOC.sheetH, background: C.surface, borderRadius: "28px 28px 0 0", boxShadow: "0 -14px 36px rgba(23,26,33,0.14)", borderTop: `1px solid ${C.border}` }}>
        {s.sheet === "comment" ? (
          <>
            <div style={{ position: "absolute", top: 22, right: 36, left: 36, display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 700 }}>
              <span>كومنت على الفقرة</span>
              <span style={{ fontSize: 24, fontWeight: 500, color: C.textMuted }}>الفقرة 1</span>
            </div>
            <div style={{ position: "absolute", top: 72, right: 36, left: 36, padding: "10px 18px", borderRight: `4px solid ${C.select}`, background: C.selectSoft, borderRadius: 8, fontSize: 24, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden" }}>
              {s.p1 === "formal" ? "«حضرة الأستاذ/ كريم المحترم، تحية طيبة وبعد…»" : "«أهلاً كريم، إزيك؟ حبيت أكلمك…»"}
            </div>
            <div style={{ position: "absolute", top: commentInputRect.y - sheetRect.y, right: SIDE + 8, width: commentInputRect.w, height: commentInputRect.h, display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar size={46} />
              <span style={{ flex: 1, height: 74, borderRadius: 18, border: `2px solid ${s.reply > 0 ? C.border : D.brand}`, boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 18px", fontSize: 28, whiteSpace: "nowrap", overflow: "hidden" }}>
                {s.comment.startsWith("@Claude") ? (
                  <>
                    <span dir="ltr" style={{ color: C.select, fontWeight: 700 }}>@Claude</span>
                    <span>&nbsp;{s.comment.slice(7)}</span>
                  </>
                ) : (
                  <span dir="ltr" style={{ color: C.select, fontWeight: 700 }}>{s.comment}</span>
                )}
                {s.reply <= 0 ? <Caret on h={32} /> : null}
              </span>
            </div>
            {s.reply > 0 ? (
              <div style={{ position: "absolute", top: replyRect.y - sheetRect.y, right: SIDE + 8, width: replyRect.w, height: replyRect.h, display: "flex", gap: 14, opacity: s.reply, translate: `0px ${(1 - s.reply) * 12}px` }}>
                <Avatar size={46} ai />
                <div style={{ flex: 1, borderRadius: 18, background: C.surfaceAlt, padding: "14px 20px", fontSize: 27, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, fontSize: 24, color: C.textMuted, marginBottom: 2 }}>Claude</div>
                  عدّلت الفقرة دي بس: شلت الألقاب الرسمية وخليت التحية بسيطة.
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div style={{ position: "absolute", top: 24, right: 36, display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 700 }}>
              <IconClock color={C.text} size={34} /> Version history
            </div>
            {[
              ["النسخة الحالية", "دلوقتي"],
              ["تعديل Claude على الافتتاحية", "من دقيقة"],
              ["المسودة الأولى", "من 5 دقايق"],
            ].map(([t, w], i) => {
              const r = historyRowRect(i);
              const hl = s.histSel === i;
              return (
                <div key={i} style={{ position: "absolute", top: r.y - sheetRect.y, right: SIDE, width: r.w, height: r.h, borderRadius: 16, background: hl ? D.brandSoft : "transparent", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", boxSizing: "border-box", borderTop: i ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 30, fontWeight: 600 }}>{t}</span>
                    <span style={{ fontSize: 24, color: C.textMuted }}>{w}</span>
                  </span>
                  {i > 0 ? (
                    <span style={{ padding: "8px 18px", borderRadius: 14, border: `2px solid ${D.brand}`, color: D.brand, fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      <IconUndo color={D.brand} size={24} /> ارجع للنسخة دي
                    </span>
                  ) : null}
                </div>
              );
            })}
          </>
        )}
      </div>
    ) : null}
  </div>
);

/* ------------------------------------------------------------------ same idea, other tools */
const VC = { top: 24, h: 296, gap: 22 };
export const variantRect = (i: number): Rect => ({ x: SIDE, y: VC.top + i * (VC.h + VC.gap), w: W - SIDE * 2, h: VC.h });
export const variantTargetRect = (i: number): Rect => {
  const r = variantRect(i);
  if (i === 0) return { x: r.x + 220, y: r.y + 152, w: r.w - 260, h: 40 };
  if (i === 1) return { x: r.x + 300, y: r.y + 104, w: 230, h: 150 };
  return { x: r.x + 330, y: r.y + 150, w: 190, h: 86 };
};

export const ToolVariants: React.FC<{ p: number[]; sel: number[] }> = ({ p, sel }) => (
  <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.workspace, fontFamily: FONT, color: C.text }}>
    {[
      { t: "فقرة في النص", Icon: IconText },
      { t: "منطقة في الصورة", Icon: IconImage },
      { t: "لقطة على الـTimeline", Icon: IconFilm },
    ].map((v, i) => {
      const r = variantRect(i);
      return (
        <div key={i} style={{ position: "absolute", top: r.y, right: SIDE, width: r.w, height: r.h, borderRadius: T.radius.lg, background: C.surface, border: `2px solid ${C.border}`, boxSizing: "border-box", opacity: p[i], translate: `0px ${(1 - p[i]) * 20}px`, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 20, right: 28, display: "flex", alignItems: "center", gap: 12, fontSize: 32, fontWeight: 700 }}>
            <v.Icon color={C.text} size={34} /> {v.t}
          </div>
          {i === 0
            ? [0, 1, 2].map((k) => (
                <div key={k} style={{ position: "absolute", top: 96 + k * 56, right: 40, width: [r.w - 80, r.w - 120, r.w - 300][k], height: 26, borderRadius: 13, background: k === 1 ? `rgba(79,70,229,${0.18 + 0.2 * sel[0]})` : C.surfaceAlt }} />
              ))
            : null}
          {i === 1 ? (
            <svg width={r.w - 80} height={190} style={{ position: "absolute", top: 84, right: 40, borderRadius: 16 }}>
              <rect width="100%" height="100%" fill="#E3EEF4" />
              <circle cx={140} cy={60} r={28} fill="#F6D58A" />
              <path d={`M0 190 L180 80 L300 150 L420 60 L${r.w - 80} 170 L${r.w - 80} 190 Z`} fill="#9FC3B4" />
              <path d={`M0 190 L240 130 L380 175 L${r.w - 80} 120 L${r.w - 80} 190 Z`} fill="#6FA08B" />
            </svg>
          ) : null}
          {i === 2 ? (
            <div style={{ position: "absolute", top: 120, right: 40, left: 40, height: 140 }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 22, display: "flex", justifyContent: "space-between", fontSize: 18, color: C.textSubtle }} dir="ltr">
                {["0:00", "0:05", "0:10", "0:15", "0:20"].map((t) => <span key={t}>{t}</span>)}
              </div>
              {[0, 1, 2, 3].map((k) => (
                <div key={k} style={{ position: "absolute", top: 34, left: 8 + k * ((r.w - 96) / 4), width: (r.w - 96) / 4 - 10, height: 74, borderRadius: 10, background: ["#CFD8F6", "#F3D9C7", "#D3EBDD", "#E6DDF3"][k], border: "1px solid rgba(23,26,33,0.08)" }} />
              ))}
              <div style={{ position: "absolute", top: 24, bottom: 10, left: 330, width: 3, background: "#E5484D" }} />
            </div>
          ) : null}
        </div>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ does every edit need confirmation? */
const CF = { top: 24, aH: 420, gap: 26 };
export const confirmA: Rect = { x: SIDE, y: CF.top, w: W - SIDE * 2, h: CF.aH };
export const confirmB: Rect = { x: SIDE, y: CF.top + CF.aH + CF.gap, w: W - SIDE * 2, h: 470 };
export const undoRect: Rect = { x: SIDE + 28, y: confirmA.y + 300, w: W - SIDE * 2 - 56, h: 86 };
export const approveRect: Rect = { x: W / 2 + 8, y: confirmB.y + 360, w: W / 2 - SIDE - 36, h: 80 };
export const sendRect: Rect = { x: SIDE + 28, y: confirmB.y + 360, w: W / 2 - SIDE - 36, h: 80 };
export const dialogRect: Rect = { x: SIDE + 120, y: confirmA.y + 120, w: W - SIDE * 2 - 240, h: 190 };

export type ConfirmState = {
  a: number; b: number;
  shorten: number; // paragraph in the draft shortened (3 lines → 2)
  undo: number; // undo bar visible
  approved: number; sent: number; pressApprove: number; pressSend: number;
  dialogs: number; // 0..3 how many repeated confirm dialogs have popped (fractional = current one)
};

const Bars: React.FC<{ n: number; widths: number[]; top: number }> = ({ n, widths, top }) => (
  <>
    {widths.slice(0, Math.ceil(n)).map((w, k) => (
      <div key={k} style={{ position: "absolute", top: top + k * 48, right: 40, width: w, height: 24, borderRadius: 12, background: C.surfaceAlt, opacity: k < Math.floor(n) ? 1 : n - Math.floor(n) }} />
    ))}
  </>
);

export const ConfirmCompare: React.FC<{ s: ConfirmState }> = ({ s }) => {
  const dlg = Math.min(3, s.dialogs);
  const k = Math.floor(dlg);
  const frac = dlg - k;
  return (
    <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.workspace, fontFamily: FONT, color: C.text }}>
      {/* A: low-stakes edit in a draft */}
      <div style={{ position: "absolute", top: confirmA.y, right: SIDE, width: confirmA.w, height: confirmA.h, borderRadius: T.radius.lg, background: C.surface, border: `2px solid ${C.border}`, boxSizing: "border-box", opacity: s.a, translate: `0px ${(1 - s.a) * 20}px` }}>
        <div style={{ position: "absolute", top: 22, right: 28, fontSize: 32, fontWeight: 700 }}>اختصار فقرة في مسودة</div>
        <div style={{ position: "absolute", top: 70, right: 28, fontSize: 24, color: C.textMuted }}>يتطبّق مباشرة</div>
        <Bars n={3 - s.shorten} widths={[confirmA.w - 80, confirmA.w - 140, confirmA.w - 360]} top={130} />
        {s.undo > 0 ? (
          <div style={{ position: "absolute", top: undoRect.y - confirmA.y, right: 28, width: undoRect.w, height: undoRect.h, borderRadius: 18, background: C.text, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px", fontSize: 28, opacity: s.undo }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><IconCheck color="#8CE0A0" size={30} stroke={3} /> اتطبّق الاختصار</span>
            <span style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span dir="ltr" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#B9BCFF" }}><IconUndo color="#B9BCFF" size={28} /> Undo</span>
              <span dir="ltr" style={{ display: "flex", alignItems: "center", gap: 8, color: "#C9CCD6", fontSize: 24 }}><IconClock color="#C9CCD6" size={24} /> history</span>
            </span>
          </div>
        ) : null}
        {/* repeated confirmation dialogs */}
        {dlg > 0
          ? [0, 1, 2].filter((i) => i <= k && i < 3).map((i) => {
              const live = i === k ? 1 - Math.max(0, frac * 3 - 2) : 0;
              if (live <= 0 && i < k) return null;
              return (
                <div key={i} style={{ position: "absolute", top: dialogRect.y - confirmA.y + i * 10, right: dialogRect.x - SIDE + i * 10, width: dialogRect.w, height: dialogRect.h, borderRadius: 22, background: C.surface, boxShadow: "0 18px 40px rgba(23,26,33,0.24)", border: `1px solid ${C.border}`, opacity: live, padding: "22px 28px", boxSizing: "border-box" }}>
                  <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 18 }}>تأكيد التعديل؟</div>
                  <div style={{ display: "flex", gap: 14 }}>
                    <span style={{ padding: "12px 34px", borderRadius: 14, background: D.brand, color: D.onBrand, fontSize: 28, fontWeight: 700 }}>تأكيد</span>
                    <span style={{ padding: "12px 34px", borderRadius: 14, border: `2px solid ${C.border}`, fontSize: 28 }}>إلغاء</span>
                  </div>
                </div>
              );
            })
          : null}
      </div>
      {/* B: high-stakes edit that will be sent */}
      <div style={{ position: "absolute", top: confirmB.y, right: SIDE, width: confirmB.w, height: confirmB.h, borderRadius: T.radius.lg, background: C.surface, border: `2px solid ${C.border}`, boxSizing: "border-box", opacity: s.b, translate: `0px ${(1 - s.b) * 20}px` }}>
        <div style={{ position: "absolute", top: 22, right: 28, fontSize: 32, fontWeight: 700 }}>تعديل شروط عرض هيتبعت لعميل</div>
        <div style={{ position: "absolute", top: 70, right: 28, fontSize: 24, color: C.textMuted }}>يستحق مراجعة واعتماد قبل الإرسال</div>
        {["مدة التنفيذ", "الدفعة الأولى", "صلاحية العرض"].map((t, i) => (
          <div key={t} style={{ position: "absolute", top: 130 + i * 70, right: 40, left: 40, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, fontSize: 28 }}>
            <span>{t}</span>
            <span style={{ width: 200, height: 22, borderRadius: 11, background: i === 1 ? C.warningSoft : C.surfaceAlt, border: i === 1 ? `2px dashed ${C.warning}` : "none" }} />
          </div>
        ))}
        <div style={{ position: "absolute", top: approveRect.y - confirmB.y, right: 28, width: approveRect.w, height: approveRect.h, borderRadius: 18, background: s.approved > 0.5 ? "#E7F5EA" : D.brand, color: s.approved > 0.5 ? C.success : D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 28, fontWeight: 700, scale: String(1 - 0.04 * s.pressApprove) }}>
          {s.approved > 0.5 ? <><IconCheck color={C.success} size={28} stroke={3} /> اتراجع واتعتمد</> : "مراجعة واعتماد"}
        </div>
        <div style={{ position: "absolute", top: sendRect.y - confirmB.y, left: 28, width: sendRect.w, height: sendRect.h, borderRadius: 18, border: `2px solid ${s.approved > 0.5 ? D.brand : C.border}`, boxSizing: "border-box", color: s.approved > 0.5 ? D.brand : C.textSubtle, background: s.sent > 0.5 ? D.brandSoft : C.surface, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 28, fontWeight: 700, scale: String(1 - 0.04 * s.pressSend) }}>
          <IconSend color={s.approved > 0.5 ? D.brand : C.textSubtle} size={28} /> {s.sent > 0.5 ? "اتبعت للعميل" : "إرسال للعميل"}
        </div>
      </div>
    </div>
  );
};
