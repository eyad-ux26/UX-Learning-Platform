import React from "react";
import { C, CONTENT, D, FONT, T } from "../brand/theme";
import { IconCalendar, IconCheck, IconMic, IconPause, IconPen, IconPlay, IconSpark, IconUser } from "../components/Icons";
import { Rect } from "../debugger/camera";

/*
 * Fictional app «مَحضر»: an AI agent turns a meeting recording into tasks. Designed at viewport width (960).
 * Illustrative only: always shown with the مثال توضيحي chip. Geometry is exported for cursors, selections and tags.
 */
export type MeetingState = {
  tasks: number; // 0 = «حوّل لمهام» button, 1 = tasks header
  pressConvert: number;
  loading: number; // skeleton card while the agent works
  card: number; // task card visible
  fTitle: number; // field reveals
  fOwner: number;
  fDue: number;
  quoteLive: number; // transcript line lit while it is being spoken
  mark: { owner: number; task: number; when: number }; // debugger marks on the transcript words
  suggest: number; // design change: «موعد مقترح» badge
  quote: number; // design change: the quote the date was built on
  actions: number; // design change: تأكيد / تعديل replace «أضف للتقويم»
  pressAdd: number;
  pressConfirm: number;
  pressQuote: number;
  playing: number; // 0..1 playback progress of the quote
  confirmed: number;
  toast: number; // «أضف للتقويم» → «اتضافت لتقويم الفريق»
  cal: number; // team calendar sheet
  calNew: number;
  calChain: number;
};

export const MEETING_IDLE: MeetingState = {
  tasks: 0, pressConvert: 0, loading: 0, card: 0, fTitle: 0, fOwner: 0, fDue: 0, quoteLive: 0,
  mark: { owner: 0, task: 0, when: 0 }, suggest: 0, quote: 0, actions: 0, pressAdd: 0, pressConfirm: 0, pressQuote: 0,
  playing: 0, confirmed: 0, toast: 0, cal: 0, calNew: 0, calChain: 0,
};
/** Task already created (the hook and the inspection start from here). */
export const MEETING_CREATED: MeetingState = { ...MEETING_IDLE, tasks: 1, card: 1, fTitle: 1, fOwner: 1, fDue: 1 };

const G = { side: 28, transY: 222, transH: 198, btnY: 448, cardY: 548, titleH: 104, rowH: 88, quoteH: 112, actionH: 124 };
const W = CONTENT.w - G.side * 2;

export const transcriptRect: Rect = { x: G.side, y: G.transY, w: W, h: G.transH };
export const transcriptQuoteRect: Rect = { x: G.side + 24, y: G.transY + 116, w: W - 48, h: 62 };
export const convertBtnRect: Rect = { x: CONTENT.w - G.side - 380, y: G.btnY, w: 380, h: 80 };
export const titleRow: Rect = { x: G.side, y: G.cardY, w: W, h: G.titleH };
export const ownerRow: Rect = { x: G.side, y: G.cardY + G.titleH, w: W, h: G.rowH };
export const dueRow: Rect = { x: G.side, y: G.cardY + G.titleH + G.rowH, w: W, h: G.rowH };
export const dueValueRect: Rect = { x: 540, y: dueRow.y + 14, w: 166, h: 60 };
export const badgeRect: Rect = { x: 330, y: dueRow.y + 18, w: 200, h: 52 };
const quoteY = dueRow.y + G.rowH;
export const quoteRowRect = (s: MeetingState): Rect => ({ x: G.side + 24, y: quoteY + 6, w: W - 48, h: (G.quoteH - 16) * s.quote });
const actionY = (s: MeetingState) => quoteY + G.quoteH * s.quote;
export const addCalRect = (s: MeetingState): Rect => ({ x: G.side + 24, y: actionY(s) + 20, w: W - 48, h: 84 });
export const confirmRect = (s: MeetingState): Rect => ({ x: CONTENT.w / 2 + 8, y: actionY(s) + 20, w: W / 2 - 32, h: 84 });
export const editRect = (s: MeetingState): Rect => ({ x: G.side + 24, y: actionY(s) + 20, w: W / 2 - 32, h: 84 });
export const actionsRect = (s: MeetingState): Rect => ({ x: G.side + 24, y: actionY(s) + 20, w: W - 48, h: 84 });
export const cardRect = (s: MeetingState): Rect => ({ x: G.side, y: G.cardY, w: W, h: actionY(s) + G.actionH - G.cardY });
const calH = (s: MeetingState) => 300 + 176 * s.calChain;
const calTop = (s: MeetingState) => CONTENT.h - calH(s) * s.cal;
export const calRowRect = (s: MeetingState, i: number): Rect => ({ x: G.side, y: calTop(s) + 92 + i * 88, w: W, h: 88 });

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Inline debugger mark on a transcript word (indigo = taken from the words, orange = inferred). */
const Mark: React.FC<{ p: number; warn?: boolean; children: React.ReactNode }> = ({ p, warn, children }) => (
  <span style={{ position: "relative", display: "inline-block", margin: "0 2px" }}>
    <span style={{ position: "absolute", inset: "2px -4px", borderRadius: 10, background: warn ? C.warningSoft : C.selectSoft, border: `2px ${warn ? "dashed" : "solid"} ${warn ? C.warning : C.select}`, opacity: p }} />
    <span style={{ position: "relative", color: p > 0.5 ? (warn ? C.warning : C.select) : undefined }}>{children}</span>
  </span>
);

const Avatar: React.FC<{ size: number; letter: string }> = ({ size, letter }) => (
  <span style={{ width: size, height: size, borderRadius: size / 2, background: "#F4E3C9", color: "#7A4B12", fontSize: size * 0.48, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{letter}</span>
);

const Field: React.FC<{ r: Rect; p: number; icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ r, p, icon, label, children }) => (
  <div style={{ position: "absolute", top: r.y, right: CONTENT.w - r.x - r.w, width: r.w, height: r.h, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, padding: "0 28px", boxSizing: "border-box", opacity: p, translate: `0px ${(1 - p) * 10}px` }}>
    <span style={{ display: "flex", width: 36 }}>{icon}</span>
    <span style={{ width: 150, fontSize: 30, color: C.textMuted }}>{label}</span>
    {children}
  </div>
);

const Btn: React.FC<{ r: Rect; primary?: boolean; press?: number; opacity?: number; children: React.ReactNode }> = ({ r, primary, press = 0, opacity = 1, children }) => (
  <div style={{ position: "absolute", top: r.y, right: CONTENT.w - r.x - r.w, width: r.w, height: r.h, borderRadius: 18, background: primary ? D.brand : C.surface, color: primary ? D.onBrand : D.brand, border: primary ? "none" : `2px solid ${D.brand}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 34, fontWeight: 700, opacity, scale: String(1 - press * 0.04), filter: `brightness(${1 - press * 0.12})` }}>
    {children}
  </div>
);

export const MeetingTasksScreen: React.FC<{ s: MeetingState }> = ({ s }) => {
  const card = cardRect(s);
  const q = quoteRowRect(s);
  return (
    <div dir="rtl" style={{ position: "absolute", inset: 0, background: C.surface, fontFamily: FONT, color: C.text }}>
      {/* app bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 92, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: D.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconMic color={D.onBrand} size={32} />
          </span>
          <span style={{ fontSize: 36, fontWeight: 700 }}>مَحضر</span>
        </div>
        <Avatar size={52} letter="ن" />
      </div>
      {/* meeting */}
      <div style={{ position: "absolute", top: 108, right: 36, fontSize: T.type.productTitle, fontWeight: 700 }}>اجتماع متابعة الإصدار</div>
      <div style={{ position: "absolute", top: 168, right: 36, fontSize: T.type.productMeta, color: C.textMuted }}>الأحد · 32 دقيقة · 5 مشاركين</div>

      {/* transcript excerpt */}
      <div style={{ position: "absolute", top: G.transY, right: G.side, width: W, height: G.transH, borderRadius: T.radius.md, background: C.surfaceAlt, boxSizing: "border-box", border: `2px solid rgba(14,124,107,${0.9 * s.quoteLive})`, boxShadow: s.quoteLive > 0 ? `0 0 0 ${6 * s.quoteLive}px rgba(14,124,107,0.12)` : "none" }}>
        <div style={{ position: "absolute", top: 18, right: 24, left: 24, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: C.textMuted }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}><IconMic color={C.textMuted} size={28} />من التسجيل</span>
          <span dir="ltr">12:41</span>
        </div>
        <div style={{ position: "absolute", top: 64, right: 24, display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700 }}>
          <Avatar size={46} letter="خ" />
          <Mark p={s.mark.owner}>خالد</Mark>
        </div>
        <div style={{ position: "absolute", top: 120, right: 24, left: 24, fontSize: 38, fontWeight: 600, lineHeight: 1.4, whiteSpace: "nowrap" }}>
          «هراجع <Mark p={s.mark.task}>مشكلة الدفع</Mark> <Mark p={s.mark.when} warn>آخر الأسبوع</Mark>»
        </div>
      </div>

      {/* convert button → tasks header */}
      <div style={{ position: "absolute", top: G.btnY, right: G.side, width: convertBtnRect.w, height: convertBtnRect.h, borderRadius: 20, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 34, fontWeight: 700, opacity: 1 - s.tasks, scale: String(1 - s.pressConvert * 0.05) }}>
        <IconSpark color={D.onBrand} size={32} />
        حوّل لمهام
      </div>
      <div style={{ position: "absolute", top: G.btnY + 14, right: 36, left: 36, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: s.tasks }}>
        <span style={{ fontSize: 36, fontWeight: 700 }}>المهام</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 26, color: C.textMuted }}>
          <IconSpark color={C.textMuted} size={26} />
          اتعملت بالـAI
        </span>
      </div>

      {/* skeleton while the agent works */}
      {s.loading > 0 && s.card < 1 ? (
        <div style={{ position: "absolute", top: G.cardY, right: G.side, width: W, height: 400, borderRadius: T.radius.lg, border: `2px solid ${C.border}`, boxSizing: "border-box", opacity: s.loading * (1 - s.card), padding: 32 }}>
          {[520, 380, 420].map((w, i) => (
            <div key={i} style={{ height: 34, width: w, borderRadius: 10, background: C.surfaceAlt, marginBottom: 56, marginRight: 0 }} />
          ))}
        </div>
      ) : null}

      {/* task card */}
      {s.card > 0 ? (
        <div style={{ position: "absolute", top: card.y, right: G.side, width: card.w, height: card.h, borderRadius: T.radius.lg, border: `2px solid ${C.border}`, boxSizing: "border-box", background: C.surface, boxShadow: "0 10px 28px rgba(23,26,33,0.07)", opacity: s.card, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, left: 0, height: G.titleH, display: "flex", alignItems: "center", gap: 20, padding: "0 28px", opacity: s.fTitle, translate: `0px ${(1 - s.fTitle) * 10}px` }}>
            <span style={{ width: 40, height: 40, borderRadius: 20, border: `3px solid ${C.textSubtle}`, boxSizing: "border-box" }} />
            <span style={{ fontSize: 40, fontWeight: 700 }}>مراجعة مشكلة الدفع</span>
          </div>
        </div>
      ) : null}
      {s.card > 0 ? (
        <div style={{ opacity: s.card }}>
          <Field r={ownerRow} p={s.fOwner} icon={<IconUser color={C.textMuted} size={34} />} label="المسؤول">
            <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 34, fontWeight: 600 }}>
              <Avatar size={46} letter="خ" />
              خالد
            </span>
          </Field>
          <Field r={dueRow} p={s.fDue} icon={<IconCalendar color={C.textMuted} size={34} />} label="الموعد">
            <span style={{ width: dueValueRect.w, fontSize: 36, fontWeight: 700 }}>الخميس</span>
            {s.suggest > 0 ? (
              <span style={{ position: "relative", width: badgeRect.w, height: badgeRect.h, opacity: s.suggest, scale: String(0.85 + 0.15 * s.suggest) }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: 999, border: `2px dashed ${C.warning}`, background: C.warningSoft, color: C.warning, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, opacity: 1 - s.confirmed }}>موعد مقترح</span>
                <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#E7F5EA", color: C.success, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 26, fontWeight: 700, opacity: s.confirmed }}>
                  <IconCheck color={C.success} size={26} stroke={3} />
                  اتأكد
                </span>
              </span>
            ) : null}
          </Field>
          {/* the quote the date was built on */}
          {s.quote > 0 ? (
            <div style={{ position: "absolute", top: q.y, right: CONTENT.w - q.x - q.w, width: q.w, height: q.h, borderRadius: 18, background: C.surfaceAlt, overflow: "hidden", display: "flex", alignItems: "center", gap: 18, padding: "0 20px", boxSizing: "border-box", opacity: clamp01(s.quote * 1.4 - 0.3), filter: `brightness(${1 - s.pressQuote * 0.06})` }}>
              <span style={{ width: 56, height: 56, borderRadius: 28, background: D.brand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.playing > 0 && s.playing < 1 ? <IconPause color={D.onBrand} size={30} stroke={3} /> : <IconPlay color={D.onBrand} size={28} />}
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 30, fontWeight: 600, whiteSpace: "nowrap" }}>«هراجع مشكلة الدفع آخر الأسبوع»</span>
                <span style={{ fontSize: 24, color: C.textMuted, whiteSpace: "nowrap" }}>خالد · <span dir="ltr">12:41</span> · من التسجيل</span>
              </span>
              {s.playing > 0 ? (
                <span style={{ position: "absolute", bottom: 0, right: 0, height: 6, width: `${s.playing * 100}%`, background: D.brand }} />
              ) : null}
            </div>
          ) : null}
          {/* actions */}
          <Btn r={addCalRect(s)} primary press={s.pressAdd} opacity={s.fDue * (1 - s.actions) * (1 - s.toast)}>
            <IconCalendar color={D.onBrand} size={34} />
            أضف للتقويم
          </Btn>
          {s.toast > 0 ? (
            <div style={{ position: "absolute", top: addCalRect(s).y, right: CONTENT.w - addCalRect(s).x - addCalRect(s).w, width: addCalRect(s).w, height: 84, borderRadius: 18, background: D.brandSoft, color: D.brand, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 32, fontWeight: 700, opacity: s.toast }}>
              <IconCheck color={D.brand} size={34} stroke={3} />
              اتضافت لتقويم الفريق · الخميس
            </div>
          ) : null}
          {s.actions > 0 ? (
            <>
              <Btn r={confirmRect(s)} primary press={s.pressConfirm} opacity={s.actions * (1 - 0.45 * s.confirmed)}>
                <IconCheck color={D.onBrand} size={34} stroke={3} />
                تأكيد
              </Btn>
              <Btn r={editRect(s)} opacity={s.actions * (1 - 0.45 * s.confirmed)}>
                <IconPen color={D.brand} size={32} />
                تعديل
              </Btn>
            </>
          ) : null}
        </div>
      ) : null}

      {/* team calendar sheet */}
      {s.cal > 0 ? (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(23,26,33,0.28)", opacity: s.cal }} />
          <div style={{ position: "absolute", top: calTop(s), left: 0, right: 0, height: calH(s), background: C.surface, borderRadius: "28px 28px 0 0", boxShadow: "0 -16px 40px rgba(23,26,33,0.16)" }}>
            <div style={{ position: "absolute", top: 24, right: 36, left: 36, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 34, fontWeight: 700 }}>
                <IconCalendar color={C.text} size={36} />
                تقويم الفريق
              </span>
              <span style={{ fontSize: 26, color: C.textMuted }}>الأسبوع ده والجاي</span>
            </div>
            {[
              { day: "الأربعاء", title: "ستاند أب الفريق", sub: "", p: 1, hl: 0 },
              { day: "الخميس", title: "مراجعة مشكلة الدفع", sub: "خالد", p: s.calNew, hl: s.calNew },
              { day: "الأحد", title: "اختبار الدفع", sub: "مبني على المراجعة", p: s.calChain, hl: 0 },
              { day: "التلات", title: "إطلاق التحديث", sub: "مبني على الاختبار", p: clamp01(s.calChain * 1.6 - 0.6), hl: 0 },
            ].map((e, i) => (
              <div key={i} style={{ position: "absolute", top: 92 + i * 88, right: G.side, width: W, height: 80, borderRadius: 16, display: "flex", alignItems: "center", gap: 20, padding: "0 20px", boxSizing: "border-box", background: e.hl > 0 ? `rgba(227,244,240,${e.hl})` : "transparent", opacity: e.p, scale: String(0.94 + 0.06 * e.p) }}>
                <span style={{ width: 140, fontSize: 28, color: C.textMuted }}>{e.day}</span>
                <span style={{ width: 8, height: 50, borderRadius: 4, background: i === 0 ? C.textSubtle : D.brand }} />
                <span style={{ fontSize: 32, fontWeight: 600 }}>{e.title}</span>
                {e.sub ? <span style={{ fontSize: 26, color: C.textMuted }}>· {e.sub}</span> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};
