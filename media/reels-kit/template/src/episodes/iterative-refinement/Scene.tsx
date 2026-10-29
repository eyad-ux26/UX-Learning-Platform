import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, CONTENT, FONT, themeVars } from "../../brand/theme";
import { Rect } from "../../debugger/camera";
import { DebuggerShell, DebugMode } from "../../debugger/DebuggerShell";
import { Inspector, Note, ScanPath, Selection, Tag } from "../../debugger/Inspect";
import { UserTouch } from "../../debugger/Pointers";
import {
  ChatState, ChatView, docP1, docP2, docP3, DocState, DocView, historyBtn, historyRowRect, lineRect, linesRect, ToolVariants, variantTargetRect,
} from "../../demo/RefineScreens";
import { IconAlert, IconBulb, IconCheck, IconChat, IconEye, IconHash, IconLock, IconLoop, IconPen, IconTarget } from "../../components/Icons";
import { cueFrame, enter, exit, Key, span } from "../../lib/timeline";
import { SceneProps } from "../registry";

/*
 * «هتحلها ازاي؟» — Iterative Refinement (illustrative writing assistant; generic UI, not a real product's screens).
 * PROBLEM (light): the whole email is rewritten from a chat instruction, so you locate the part by words and re-read
 * everything → turn «طب هما حلوها ازاي؟»: the whole frame switches to the dark theme for the SOLUTION → select the
 * paragraph, comment, only that paragraph changes, reply in the thread, review in place, edit by hand or restore a version
 * → Iterative Refinement → the same idea in other tools. (Eyad asked to end the episode after that sentence.)
 */
const typed = (frame: number, text: string, a: number, b: number) =>
  text.slice(0, Math.round(interpolate(frame, [a, b], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
const ALT1 = "عدّل من السطر التالت للخامس";
const ALT2 = "من كلمة كذا لكلمة كذا، وخلّي باقي الكلام زي ما هو";
const COMMENT = "@Claude خلّي الافتتاحية أبسط وأقل رسمية";
const P1_LINES = (r: Rect) => [0, 1, 2].map((i) => ({ x: r.x, y: r.y + i * 58 + 4, w: r.w, h: 50 }));

/** Typing windows (frames) shared with sfx.json so the keyboard sound follows the letters on screen. */
export const IR_TYPING = { alt1: ["type1", 0, "lines35", 10], alt2: ["type2", 0, "keepRest", 30], comment: ["comment", 18, "commentText", 50] } as const;

export const IterativeRefinementScene: React.FC<SceneProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const ids = [
    "open", "email", "content", "formal", "chat", "type1", "lines35", "alt", "type2", "keepRest", "rewrite", "reviewPart", "readRest", "dates",
    "effort", "effort1", "effort2", "turn", "docs", "select", "comment", "commentText", "scope", "edit", "reply", "review", "hand", "history",
    "concept", "term", "stepwise", "tools", "tText", "tImage", "tTimeline",
  ] as const;
  const B = Object.fromEntries(ids.map((id) => [id, cueFrame(timeline, id)])) as Record<(typeof ids)[number], number>;
  const blink = Math.floor(frame / 15) % 2 === 0;
  const W = (k: keyof typeof IR_TYPING) => [B[IR_TYPING[k][0]] + IR_TYPING[k][1], B[IR_TYPING[k][2]] + IR_TYPING[k][3]] as const;

  // ---- problem → solution: the theme switches on the turn line --------------------------------------------
  const dark = interpolate(frame, [B.turn + 8, B.turn + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const divider = span(frame, B.turn + 4, B.docs + 2, 10);

  // ---- which product view is on screen -----------------------------------------------------------------
  const docIn = enter(frame, B.docs - 8, 12);
  const toolsIn = enter(frame, B.tools, 14);

  // ---- chat (old way) ----------------------------------------------------------------------------------
  const sendAt = B.rewrite - 6;
  const [a1, b1] = W("alt1"), [a2, b2] = W("alt2"), [ac, bc] = W("comment");
  const chat: ChatState = {
    input: frame < B.alt ? typed(frame, ALT1, a1, b1) : frame < sendAt ? typed(frame, ALT2, a2, b2) : "",
    caret: blink && frame >= B.chat && frame < sendAt,
    bubble: ALT2,
    bubbleP: enter(frame, sendAt, 10),
    v2: interpolate(frame, [B.rewrite + 14, B.rewrite + 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    rewriting: span(frame, B.rewrite + 4, B.rewrite + 40, 8) + span(frame, B.email - 4, B.email + 30, 8),
  };

  // ---- document (new way) ----------------------------------------------------------------------------------
  const histAt = B.history + 6;
  const doc: DocState = {
    p1: frame < B.edit + 6 ? "formal" : frame < B.hand + 10 ? "simple" : "hand",
    p1Prev: frame < B.hand + 10 ? "formal" : "simple",
    p1T: frame < B.edit + 6 ? 1 : frame < B.hand + 10 ? enter(frame, B.edit + 6, 14) : enter(frame, B.hand + 10, 8),
    sel: interpolate(frame, [B.select + 2, B.select + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * exit(frame, B.edit + 4, 10),
    changed: span(frame, B.edit + 10, B.review + 20, 10),
    caret: frame >= B.hand && frame < B.history && blink,
    sheet: frame < B.review ? "comment" : "history",
    sheetP: frame < B.review ? span(frame, B.comment, B.review, 12) : span(frame, histAt, B.concept, 12),
    comment: typed(frame, COMMENT, ac, bc),
    reply: enter(frame, B.reply, 12),
    histSel: frame >= B.history + 30 ? 1 : -1,
    p2Flag: 0,
    pressHistory: span(frame, histAt - 4, histAt + 8, 4),
  };

  // ---- debugger mode -----------------------------------------------------------------------------------------
  const MODES: [number, DebugMode][] = [
    [0, "live"], [B.content, "inspect"], [B.chat, "live"], [B.lines35, "inspect"], [B.alt, "live"], [B.reviewPart, "inspect"],
    [B.turn, "change"], [B.scope, "inspect"], [B.edit, "change"], [B.review, "replay"], [B.concept, "inspect"], [B.tools, "compare"],
  ];
  const mode = MODES.filter(([f]) => frame >= f).pop()![1];
  const inR = (a: number, b: number) => frame >= a && frame < b;
  const rewind = span(frame, B.docs - 10, B.docs - 2, 4);

  // ---- pointers ----------------------------------------------------------------------------------------------
  const p1Line0 = P1_LINES(docP1)[0];
  const selTouch: Key[] = [
    { f: B.select - 10, x: 760, y: 520 },
    { f: B.select, x: p1Line0.x + p1Line0.w - 10, y: p1Line0.y + 26, click: true },
    { f: B.select + 22, x: docP1.x + 40, y: docP1.y + docP1.h - 30 },
    { f: B.comment - 4, x: 820, y: 40 },
    { f: B.comment + 2, x: 836, y: 42, click: true },
    { f: B.comment + 14, x: 600, y: 760 },
  ];
  const handTouch: Key[] = [
    { f: B.hand - 6, x: 600, y: 420 },
    { f: B.hand + 4, x: docP1.x + docP1.w - 150, y: p1Line0.y + 26, click: true },
    { f: histAt - 10, x: historyBtn.x + 40, y: historyBtn.y + 30 },
    { f: histAt, x: historyBtn.x + 40, y: historyBtn.y + 30, click: true },
    { f: B.history + 30, x: historyRowRect(1).x + 140, y: historyRowRect(1).y + 50 },
  ];

  const overlay = (
    <>
      {/* ---- PROBLEM: chat view and its inspection ---- */}
      {frame < B.docs + 4 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - docIn, ...themeVars(0) }}>
          <ChatView s={chat} />
        </div>
      ) : null}
      {inR(B.content, B.docs) ? (
        <>
          <Tag r={linesRect(5, 6)} x={lineRect(5).x + 8} icon={IconCheck} text="المحتوى مناسب" progress={span(frame, B.content + 4, B.chat)} />
          <Selection r={linesRect(0, 4)} pad={2} hover={span(frame, B.formal, B.chat)} selected={0} />
          <Tag r={linesRect(0, 1)} x={lineRect(0).x + 8} tone="warn" icon={IconAlert} text="رسمية زيادة" progress={span(frame, B.formal + 6, B.chat)} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} style={{ position: "absolute", left: lineRect(i).x - 6, top: lineRect(i).y + 8, width: 34, height: 32, borderRadius: 8, background: i >= 2 && i <= 4 ? C.select : C.selectSoft, color: i >= 2 && i <= 4 ? C.selectText : C.select, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", opacity: span(frame, B.lines35 - 6 + i, B.rewrite) }}>
              {i + 1}
            </div>
          ))}
          <Selection r={linesRect(2, 4)} pad={2} hover={0} selected={span(frame, B.lines35 + 4, B.rewrite)} label="السطور من 3 لـ 5" labelSide="left" />
          <Tag r={linesRect(2, 4)} x={lineRect(2).x + 46} tone="warn" icon={IconHash} text="لازم تعدّ السطور بنفسك" progress={span(frame, B.lines35 + 14, B.alt + 4)} />
          <Selection r={linesRect(0, 4)} pad={2} hover={0} selected={span(frame, B.reviewPart, B.readRest + 4)} label="الجزء المطلوب" labelSide="left" />
          <ScanPath rects={[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ ...lineRect(i), x: lineRect(i).x + lineRect(i).w - 200, w: 120 }))} progress={span(frame, B.readRest, B.effort) * interpolate(frame, [B.readRest, B.dates + 12], [0, 1], { extrapolateRight: "clamp" })} />
          <Tag r={linesRect(5, 6)} x={lineRect(5).x + 8} tone="warn" icon={IconEye} text="المواعيد زي ما هي؟" progress={span(frame, B.dates, B.effort + 4)} />
          <Inspector title="تعديل صغير… بمجهودين" icons={[IconTarget, IconEye]} rows={[["تحديد مكانه", "بالكلام في الشات"], ["مراجعة النتيجة", "الإيميل كله من الأول"]]} progress={span(frame, B.effort1 - 6, B.turn + 4, 14)} />
        </>
      ) : null}

      {/* ---- SOLUTION: document view (dark theme) ---- */}
      {docIn > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: docIn }}>
          <DocView s={doc} />
        </div>
      ) : null}
      {inR(B.docs, B.tools + 14) ? (
        <>
          <Selection r={docP1} pad={8} hover={0} selected={span(frame, B.scope, B.edit + 4)} label="النطاق: الفقرة دي بس" labelSide="left" />
          <Tag r={{ ...docP2, y: docP2.y + 60, h: 52 }} x={docP2.x + 8} icon={IconLock} text="زي ما هي" progress={span(frame, B.edit + 14, B.review)} />
          <Tag r={docP3} x={docP3.x + 8} icon={IconLock} text="زي ما هي" progress={span(frame, B.edit + 18, B.review)} />
          <ScanPath rects={P1_LINES(docP1).slice(0, 2).map((r) => ({ ...r, x: r.x + r.w - 260, w: 200 }))} progress={span(frame, B.review + 4, B.hand) * interpolate(frame, [B.review + 4, B.review + 30], [0, 1], { extrapolateRight: "clamp" })} />
          <Tag r={{ ...docP1, y: docP1.y - 60, h: 40 }} x={docP1.x + 8} icon={IconEye} text="المراجعة في مكانها" progress={span(frame, B.review + 10, B.hand)} />
          <Tag r={{ ...docP1, y: docP1.y - 60, h: 40 }} x={docP1.x + 8} icon={IconPen} text="تعديل بإيدك" progress={span(frame, B.hand + 2, B.history + 4)} />
          <Note anchor={docP3} icon={IconLoop} text="Iterative Refinement" source="التحسين التدريجي: خطوة بخطوة، بأدوات تحكم مناسبة" progress={span(frame, B.term - 4, B.tools + 4)} />
        </>
      ) : null}

      {/* ---- same idea, other tools (the episode ends here) ---- */}
      {toolsIn > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: toolsIn }}>
          <ToolVariants p={[enter(frame, B.tools + 4, 12), enter(frame, B.tools + 10, 12), enter(frame, B.tools + 16, 12)]} sel={[enter(frame, B.tText, 8), enter(frame, B.tImage, 8), enter(frame, B.tTimeline, 8)]} />
          {[B.tText, B.tImage, B.tTimeline].map((f, i) => (
            <Selection key={i} r={variantTargetRect(i)} pad={4} hover={0} selected={enter(frame, f, 10)} />
          ))}
        </div>
      ) : null}

      {/* the turn: from the problem to the solution */}
      {divider > 0 ? (
        <div style={{ position: "absolute", inset: 0, background: `rgba(13,15,20,${0.86 * divider})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div dir="rtl" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: divider, scale: String(0.9 + 0.1 * divider), fontFamily: FONT }}>
            <div style={{ width: 150, height: 150, borderRadius: 75, background: "#8C84FF", boxShadow: "0 0 0 18px rgba(140,132,255,0.18), 0 0 0 40px rgba(140,132,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconBulb color="#FFFFFF" size={84} stroke={2} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700, color: "#FFFFFF", padding: "14px 18px 14px 28px", borderRadius: 999, background: "#181B22", border: "2px solid #2E3340" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, color: "#A7ADBC" }}><IconChat color="#A7ADBC" size={40} />المشكلة</span>
              <span style={{ color: "#A7ADBC" }}>←</span>
              <span style={{ padding: "8px 26px", borderRadius: 999, background: "#8C84FF" }}>الحل</span>
            </div>
          </div>
        </div>
      ) : null}

      <UserTouch frame={frame} keys={selTouch} from={B.select - 10} to={B.comment + 16} />
      <UserTouch frame={frame} keys={handTouch} from={B.hand - 6} to={B.history + 34} />
      <div style={{ position: "absolute", inset: 0, background: C.surface, opacity: rewind * 0.85 }} />
    </>
  );

  return (
    <AbsoluteFill style={themeVars(dark)}>
      <DebuggerShell mode={mode} address="assistant/email-draft" illustrative overlay={overlay}>
        <div style={{ position: "absolute", width: CONTENT.w, height: CONTENT.h, background: C.surface }} />
      </DebuggerShell>
    </AbsoluteFill>
  );
};
