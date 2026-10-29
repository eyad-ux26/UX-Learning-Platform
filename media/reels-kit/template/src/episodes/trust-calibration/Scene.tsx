import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, CONTENT, T } from "../../brand/theme";
import { Cam, cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../../debugger/camera";
import { DebuggerShell, DebugMode } from "../../debugger/DebuggerShell";
import { ChangeTag, Checklist, FocusDim, Note, Selection, Tag } from "../../debugger/Inspect";
import { InspectCursor, UserTouch } from "../../debugger/Pointers";
import {
  actionsRect, addCalRect, cardRect, badgeRect, calRowRect, confirmRect, convertBtnRect, dueRow, editRect, MEETING_CREATED,
  MEETING_IDLE, MeetingState, MeetingTasksScreen, ownerRow, quoteRowRect, titleRow, transcriptQuoteRect,
} from "../../demo/MeetingTasksScreen";
import { OptionsCompare } from "../../demo/OptionsCompare";
import { cueFrame, enter, exit, Key, span } from "../../lib/timeline";
import { SceneProps } from "../registry";

/*
 * «هتحلها ازاي؟» — Trust Calibration (illustrative app «مَحضر»).
 * Hook (the confident «الخميس» gets added to the calendar) → the story (recording → task) → pause, select, dim + enlarge:
 * title/owner come from the words, the date is an inference → it becomes a team commitment → extracted vs inferred →
 * the turn «طيب هتحلها ازاي؟» → change: «موعد مقترح» + the quote + تأكيد/تعديل → replay → Trust Calibration →
 * trade-off: review effort follows the cost of a mistake → the three-part decision → closing A/B question.
 * Every beat time comes from storyboard.json → timeline.json (aligned to Eyad's recording).
 */
const H = CONTENT.h;
const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
/** A point on the readable (right) part of a row: RTL rows keep their content on the right. */
const rightPart = (r: Rect, inset = 260) => ({ x: r.x + r.w - inset, y: r.y + r.h / 2 });
/** Cursor tip just under an element, so the arrow never covers the text it points at. */
const under = (p: { x: number; y: number }, dy = 30) => ({ x: p.x, y: p.y + dy });

export const TrustCalibrationScene: React.FC<SceneProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const c = (id: string) => cueFrame(timeline, id);
  const B = {
    open: c("open"), hookTranscript: c("hookTranscript"), noThursday: c("noThursday"), hookAI: c("hookAI"), hookSure: c("hookSure"), hookTap: c("hookTap"),
    story: c("story"), convertTap: c("convertTap"), quote: c("quote"), created: c("created"), fTitle: c("fTitle"), fOwner: c("fOwner"), fDue: c("fDue"),
    pause: c("pause"), selOwner: c("selOwner"), selTitle: c("selTitle"), selDue: c("selDue"), interp: c("interp"), interpNote: c("interpNote"),
    same: c("same"), sameLook: c("sameLook"), sameTrust: c("sameTrust"), commit: c("commit"), commitEvent: c("commitEvent"),
    principle: c("principle"), extracted: c("extracted"), inferred: c("inferred"), turn: c("turn"), example: c("example"), suggested: c("suggested"),
    linked: c("linked"), quoteLink: c("quoteLink"), actions: c("actions"), confirmBtn: c("confirmBtn"), editBtn: c("editBtn"),
    clearer: c("clearer"), verify: c("verify"), fix: c("fix"), trust: c("trust"), trustTerm: c("trustTerm"),
    question: c("question"), impact: c("impact"), impTitle: c("impTitle"), impDue: c("impDue"), impCal: c("impCal"), impChain: c("impChain"),
    impReview: c("impReview"), quoteReal: c("quoteReal"), decision: c("decision"), d1: c("d1"), d2: c("d2"), d3: c("d3"),
    choice: c("choice"), optA: c("optA"), optB: c("optB"), cta: c("cta"), next: c("next"),
  };
  const Z = T.motion.zoomFrames;
  const tapCommit = B.commit + 14;

  // ---- product state (one function of frame; phases keyed to beats) --------------------------
  const changed = (f: number): MeetingState => ({
    ...MEETING_CREATED,
    suggest: enter(f, B.suggested - 2, 14),
    quote: enter(f, B.linked + 4, 18),
    actions: enter(f, B.actions, 14),
  });
  const stateAt = (f: number): MeetingState => {
    if (f < B.story)
      return { ...MEETING_CREATED, quoteLive: span(f, B.hookTranscript, B.hookAI + 4), pressAdd: span(f, B.hookTap - 3, B.hookTap + 9, 4), toast: span(f, B.hookTap + 6, B.story + 2, 8) };
    if (f < B.pause)
      return {
        ...MEETING_IDLE,
        pressConvert: span(f, B.convertTap - 3, B.convertTap + 9, 4),
        tasks: enter(f, B.convertTap + 6, 10),
        loading: enter(f, B.convertTap + 8, 10),
        quoteLive: span(f, B.quote, B.created + 4),
        card: enter(f, B.created, 10),
        fTitle: enter(f, B.fTitle - 2, 10),
        fOwner: enter(f, B.fOwner - 2, 10),
        fDue: enter(f, B.fDue - 2, 10),
      };
    if (f < B.principle)
      return {
        ...MEETING_CREATED,
        mark: {
          owner: enter(f, B.selOwner + 4, 8) * exit(f, B.commit, 10),
          task: enter(f, B.selTitle + 4, 8) * exit(f, B.commit, 10),
          when: enter(f, B.interpNote, 8) * exit(f, B.commit, 10),
        },
        pressAdd: span(f, tapCommit - 3, tapCommit + 9, 4),
        cal: span(f, tapCommit + 8, B.principle + 4, 14),
        calNew: enter(f, B.commitEvent - 6, 12),
      };
    if (f < B.turn) return MEETING_CREATED;
    if (f < B.clearer) return changed(f);
    const full = { ...changed(f), suggest: 1, quote: 1, actions: 1 };
    if (f < B.question) {
      const playEnd = B.fix - 6;
      return {
        ...full,
        pressQuote: span(f, B.verify - 3, B.verify + 9, 4),
        playing: f >= B.verify + 4 && f < playEnd + 10 ? interpolate(f, [B.verify + 4, playEnd], [0.02, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
        pressConfirm: span(f, B.fix - 3, B.fix + 9, 4),
        confirmed: enter(f, B.fix + 4, 10),
      };
    }
    if (f < B.decision)
      return {
        ...full,
        confirmed: exit(f, B.question, 12),
        cal: span(f, B.impCal - 2, B.impReview + 10, 14),
        calNew: 1,
        calChain: enter(f, B.impChain, 16),
      };
    return full;
  };
  const s = stateAt(frame);

  // ---- camera ----------------------------------------------------------------------------------
  const sDue = 1.32;
  const dueFx = (sc: number) => dueRow.x + dueRow.w - (CONTENT.w / 2 - 36) / sc;
  const shots: Shot[] = [
    { f: 0, s: 1, fx: CONTENT.w / 2, fy: H / 2 },
        { f: B.hookAI, s: sDue, fx: dueFx(sDue), fy: mid(dueRow).y, cy: H * 0.45 },
    { f: B.hookSure, s: 1, fx: CONTENT.w / 2, fy: H / 2 },
    { f: B.interp, s: 1.36, fx: dueFx(1.36), fy: mid(dueRow).y, cy: H * 0.4 },
    { f: B.same, s: 1, fx: CONTENT.w / 2, fy: H / 2 },
    { f: B.example, s: 1, fx: CONTENT.w / 2, fy: 578 },
    { f: B.suggested - 6, s: 1.3, fx: dueFx(1.3), fy: mid(dueRow).y + 30, cy: H * 0.42 },
    { f: B.linked, s: 1.06, fx: CONTENT.w / 2, fy: 840, cy: H * 0.5 },
    { f: B.clearer, s: 1, fx: CONTENT.w / 2, fy: 578 },
    { f: B.trust, s: 1, fx: CONTENT.w / 2, fy: 760 },
    { f: B.question, s: 1, fx: CONTENT.w / 2, fy: 578 },
    { f: B.impCal - 4, s: 1, fx: CONTENT.w / 2, fy: H / 2 },
    { f: B.impReview + 8, s: 1, fx: CONTENT.w / 2, fy: 578 },
    { f: B.decision, s: 1, fx: CONTENT.w / 2, fy: 943 },
  ];
  const cam = cameraAt(frame, shots);
  const camAt = (f: number): Cam => cameraAt(f, shots);
  const R = (r: Rect) => camRect(r, cam);
  const P = (p: { x: number; y: number }, f: number) => camPoint(p, camAt(f));

  // ---- debugger mode -----------------------------------------------------------------------------
  const mode: DebugMode =
    frame < B.pause ? "live"
    : frame < B.pause + 8 ? "paused"
    : frame < B.commit ? "inspect"
    : frame < B.principle ? "live"
    : frame < B.turn ? "inspect"
    : frame < B.clearer ? "change"
    : frame < B.trust ? "replay"
    : frame < B.choice ? "inspect"
    : "compare";

  // ---- pointers ----------------------------------------------------------------------------------
  const hookTouch: Key[] = [
    { f: B.hookSure, x: 600, y: 1000 },
    { f: B.hookTap, ...P(mid(addCalRect(s)), B.hookTap), click: true },
    { f: B.story - 4, ...P(mid(addCalRect(s)), B.hookTap) },
  ];
  const storyTouch: Key[] = [
    { f: B.story + 12, x: 520, y: 900 },
    { f: B.convertTap, ...P(mid(convertBtnRect), B.convertTap), click: true },
    { f: B.quote, x: 640, y: 900 },
  ];
  const commitTouch: Key[] = [
    { f: B.commit, x: 600, y: 1000 },
    { f: tapCommit, ...P(mid(addCalRect(MEETING_CREATED)), tapCommit), click: true },
    { f: B.commitEvent, x: 560, y: 980 },
  ];
  const full = { ...MEETING_CREATED, suggest: 1, quote: 1, actions: 1 };
  const playBtn = (st: MeetingState) => ({ x: quoteRowRect(st).x + quoteRowRect(st).w - 48, y: quoteRowRect(st).y + quoteRowRect(st).h / 2 });
  const replayTouch: Key[] = [
    { f: B.clearer + 6, x: 560, y: 1000 },
    { f: B.verify, ...P(playBtn(full), B.verify), click: true },
    { f: B.verify + 24, ...P(playBtn(full), B.verify) },
    { f: B.fix, ...P(mid(confirmRect(full)), B.fix), click: true },
    { f: B.trust - 4, ...P(mid(confirmRect(full)), B.fix) },
  ];
  const settle = (f: number) => f + Z;
  const inspectKeys1: Key[] = [
    { f: B.pause + 6, x: 820, y: 960 },
    { f: B.selOwner, ...P(under(rightPart(ownerRow, 240)), B.selOwner), click: true },
    { f: B.selTitle, ...P(under(rightPart(titleRow, 330)), B.selTitle), click: true },
    { f: B.selDue, ...P(under(rightPart(dueRow, 300)), B.selDue), click: true },
    { f: B.interp, ...P(under(rightPart(dueRow, 300)), B.interp) },
    { f: settle(B.interp), ...P(under(rightPart(dueRow, 300)), settle(B.interp)) },
    { f: B.same, ...P(under(rightPart(dueRow, 300)), B.same) },
    { f: settle(B.same), x: 200, y: 700 },
    { f: B.commit, x: 200, y: 700 },
  ];
  const inspectKeys2: Key[] = [
    { f: B.principle + 8, x: 820, y: 960 },
    { f: B.extracted, ...P(under(rightPart(ownerRow, 240)), B.extracted) },
    { f: B.inferred, ...P(under(rightPart(dueRow, 300)), B.inferred), click: true },
    { f: B.turn, ...P(under(rightPart(dueRow, 300)), B.turn), click: true },
    { f: B.suggested - 6, ...P(under(rightPart(dueRow, 300)), B.suggested - 6) },
    { f: settle(B.suggested - 6), ...P(under(mid(badgeRect)), settle(B.suggested - 6)) },
    { f: B.linked, ...P(under(mid(badgeRect)), B.linked) },
    { f: settle(B.linked), ...P(under(rightPart(quoteRowRect(full), 360)), settle(B.linked)) },
    { f: B.actions, ...P(under(rightPart(quoteRowRect(full), 360)), B.actions) },
    { f: B.confirmBtn, ...P(mid(confirmRect(full)), B.confirmBtn), click: true },
    { f: B.editBtn, ...P(mid(editRect(full)), B.editBtn), click: true },
    { f: B.clearer, ...P(mid(editRect(full)), B.clearer) },
  ];
  const inspectKeys3: Key[] = [
    { f: B.question + 4, x: 820, y: 960 },
    { f: B.impTitle, ...P(under(rightPart(titleRow, 330)), B.impTitle), click: true },
    { f: B.impDue, ...P(under(rightPart(dueRow, 300)), B.impDue), click: true },
    { f: B.impCal, x: 760, y: 990 },
    { f: B.impReview + 10, x: 760, y: 990 },
    { f: B.quoteReal, ...P(under(rightPart(quoteRowRect(full), 360)), B.quoteReal), click: true },
    { f: B.decision, ...P(under(rightPart(quoteRowRect(full), 360)), B.quoteReal) },
    { f: settle(B.decision), x: 860, y: 240 },
    { f: B.choice, x: 860, y: 240 },
  ];

  // ---- overlays ----------------------------------------------------------------------------------
  const freeze = span(frame, B.pause, B.selOwner + 10, 6) + span(frame, B.turn, B.turn + 22, 6);
  const rewind = span(frame, B.story - 4, B.story + 6, 4) + span(frame, B.clearer - 4, B.clearer + 6, 4);
  const inPhase1 = frame >= B.pause && frame < B.commit + 10;
  const dueSel = R(dueRow);
  const compare = enter(frame, B.choice, 16);

  const overlay = (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.workspace, opacity: Math.min(1, freeze) * 0.35 }} />

      {/* hook: the date isn't in the words */}
      <Tag r={R(transcriptQuoteRect)} text="مفيش «الخميس» هنا" tone="warn" progress={span(frame, B.noThursday, B.hookAI + 4)} />

      {/* phase 1: what comes from the words vs. what the system inferred */}
      {inPhase1 ? (
        <>
          <FocusDim r={dueSel} amount={enter(frame, B.interp, T.motion.dimFrames) * exit(frame, B.same, 14)} />
          <Tag r={R(ownerRow)} x={R(ownerRow).x + 150} text="من الكلام" progress={enter(frame, B.selOwner + 4, 8) * exit(frame, B.same, 10)} />
          <Tag r={R(titleRow)} x={R(titleRow).x + 150} text="من الكلام" progress={enter(frame, B.selTitle + 4, 8) * exit(frame, B.same, 10)} />
          <Selection r={dueSel} hover={enter(frame, B.selDue - 6, 6) * exit(frame, B.same, 8)} selected={enter(frame, B.selDue, T.motion.selectFrames) * exit(frame, B.same, 8)} label="الموعد" labelSide="left" />
          <Note anchor={dueSel} text="«آخر الأسبوع» ← الخميس" source="ده استنتاج النظام، مش كلام خالد" progress={span(frame, B.interpNote, B.same + 4)} />
          {[titleRow, ownerRow, dueRow].map((r, i) => (
            <Selection key={i} r={R(r)} pad={-4} hover={span(frame, B.same + 2 + i * 3, B.commit)} selected={0} />
          ))}
          <Note anchor={R(titleRow)} place="above" text="التلاتة بنفس الشكل والوزن" progress={span(frame, B.sameLook, B.sameTrust + 2)} />
          <Note anchor={R(titleRow)} place="above" text="فبيتصدّقوا بنفس الدرجة" progress={span(frame, B.sameTrust, B.commit)} />
        </>
      ) : null}

      {/* principle: extracted vs inferred */}
      {frame >= B.principle && frame < B.turn + 12 ? (
        <>
          <Tag r={R(titleRow)} text="مستخرج" progress={span(frame, B.extracted, B.turn + 6)} />
          <Tag r={R(ownerRow)} text="مستخرج" progress={span(frame, B.extracted + 3, B.turn + 6)} />
          <Tag r={R(dueRow)} text="مستنتج" tone="warn" progress={span(frame, B.inferred, B.turn + 6)} />
        </>
      ) : null}

      {/* change */}
      {frame >= B.turn && frame < B.clearer ? (
        <>
          <Selection r={R(dueRow)} hover={0} selected={enter(frame, B.turn + 4, T.motion.selectFrames) * exit(frame, B.linked, 10)} label={frame < B.suggested ? "الموعد" : undefined} labelSide="left" />
          <ChangeTag r={R(badgeRect)} text="موعد مقترح" progress={span(frame, B.suggested + 4, B.linked + 2)} />
          <Selection r={R(quoteRowRect(s))} hover={0} selected={enter(frame, B.quoteLink, 10) * exit(frame, B.actions, 10)} />
          <Tag r={R(quoteRowRect(s))} text="+ أساس التاريخ" progress={span(frame, B.linked + 18, B.actions)} />
          <Selection r={R(confirmRect(s))} hover={span(frame, B.confirmBtn - 4, B.clearer)} selected={0} />
          <Selection r={R(editRect(s))} hover={span(frame, B.editBtn - 4, B.clearer)} selected={0} />
        </>
      ) : null}

      {/* trust calibration */}
      <Note anchor={R(cardRect(s))} text="Trust Calibration" source="الثقة في كل نتيجة على قد المعلومات المتاحة" progress={span(frame, B.trustTerm, B.question)} />

      {/* trade-off: review effort follows the cost of a mistake */}
      {frame >= B.question && frame < B.decision + 6 ? (
        <>
          <Selection r={R(titleRow)} pad={-4} hover={span(frame, B.question + 4, B.impCal)} selected={0} />
          <Selection r={R(dueRow)} pad={-4} hover={span(frame, B.question + 8, B.impCal)} selected={0} />
          <Tag r={R(titleRow)} text="أثر صغير · سهل يتعدّل" progress={span(frame, B.impTitle + 4, B.quoteReal) * (1 - s.cal)} />
          <Tag r={R(dueRow)} text="أثر كبير" tone="warn" progress={span(frame, B.impDue + 4, B.quoteReal) * (1 - s.cal)} />
          <Selection r={R(calRowRect(s, 1))} pad={-4} hover={0} selected={span(frame, B.impCal + 8, B.impReview + 8)} />
          <Selection r={R(quoteRowRect(s))} hover={0} selected={span(frame, B.quoteReal, B.decision + 4)} label="الاقتباس" labelSide="left" />
          <Tag r={R(quoteRowRect(s))} text="بالنص من التسجيل" progress={span(frame, B.quoteReal + 6, B.decision + 4)} />
        </>
      ) : null}

      {/* the design decision */}
      {frame >= B.decision && frame < B.choice + 10 ? (
        <>
          <Selection r={R(badgeRect)} hover={0} selected={span(frame, B.d1, B.d2)} />
          <Selection r={R(quoteRowRect(s))} hover={0} selected={span(frame, B.d2, B.d3)} />
          <Selection r={R(actionsRect(s))} hover={0} selected={span(frame, B.d3, B.choice)} />
          <Checklist
            title="القرار التصميمي"
            progress={span(frame, B.decision + 4, B.choice + 4, 14)}
            active={frame >= B.d3 ? 2 : frame >= B.d2 ? 1 : frame >= B.d1 ? 0 : -1}
            items={[
              { text: "نوضّح موضع عدم اليقين", p: enter(frame, B.d1, 10) },
              { text: "نعرض أساس النتيجة", p: enter(frame, B.d2, 10) },
              { text: "نخلّي التصحيح سهل", p: enter(frame, B.d3, 10) },
            ]}
          />
        </>
      ) : null}

      {/* pointers */}
      <UserTouch frame={frame} keys={hookTouch} from={B.hookSure} to={B.story} />
      <UserTouch frame={frame} keys={storyTouch} from={B.story + 12} to={B.quote + 4} />
      <InspectCursor frame={frame} keys={inspectKeys1} from={B.pause + 6} to={B.commit} />
      <UserTouch frame={frame} keys={commitTouch} from={B.commit} to={B.commitEvent + 6} />
      <InspectCursor frame={frame} keys={inspectKeys2} from={B.principle + 8} to={B.clearer} />
      <UserTouch frame={frame} keys={replayTouch} from={B.clearer + 6} to={B.trust} />
      <InspectCursor frame={frame} keys={inspectKeys3} from={B.question + 4} to={B.decision + 8} />

      {/* closing comparison */}
      {compare > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: compare }}>
          <OptionsCompare a={enter(frame, B.optA - 6, 14)} b={enter(frame, B.optB - 6, 14)} selA={span(frame, B.optA, B.optB)} selB={span(frame, B.optB, B.cta)} cta={enter(frame, B.cta, 14)} />
        </div>
      ) : null}

      <div style={{ position: "absolute", inset: 0, background: C.surface, opacity: Math.min(1, rewind) * 0.85 }} />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="mahdar.app/tasks" illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <MeetingTasksScreen s={s} />
        </div>
      </DebuggerShell>
    </AbsoluteFill>
  );
};
