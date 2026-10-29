import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, FONT, S, T } from "../../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Shot } from "../../debugger/camera";
import { DebuggerShell, DebugMode } from "../../debugger/DebuggerShell";
import { ChangeTag, FocusDim, Inspector, Note, Selection } from "../../debugger/Inspect";
import { InspectCursor, UserTouch } from "../../debugger/Pointers";
import { CategoryScreen, CategoryState, centerOf, rowRect, subRect } from "../../demo/CategoryScreen";
import { cueFrame, enter, exit, Key, span } from "../../lib/timeline";
import { SceneProps } from "../registry";

/*
 * Visual-direction preview (silent, illustrative content). Signature sequence:
 * 1 interaction → 2 pause → 3 select with the debugger cursor → 4 dim + enlarge → 5 one observation (+ brief inspector)
 * → 6 visible design change (+ its trade-off) → 7 replay the interaction.
 * All beat times come from storyboard.json via timeline.json.
 */
export const DebuggerPreviewScene: React.FC<SceneProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const f = (id: string) => cueFrame(timeline, id);
  const [tUser, tMen, tDrift, tHes, tPause, tInspect, tHover, tSelect, tFocus, tNote, tInsOpen, tInsClose, tChange, tTrade, tReplay, tTapSports, tTapSub] =
    ["userIn", "tapMen", "drift", "hesitate", "pause", "inspectIn", "hover", "select", "focus", "note", "inspectorOpen", "inspectorClose", "change", "tradeoff", "replay", "tapSports", "tapSub"].map(f);

  const replaying = frame >= tReplay;
  // ---- product state -----------------------------------------------------------------------
  const before: CategoryState = {
    expand: { رجالي: enter(frame, tMen + 2, 12) },
    hints: enter(frame, tChange + 6, 18),
    pressed: { رجالي: span(frame, tMen - 2, tMen + 10, 4) },
  };
  const after: CategoryState = {
    expand: { رياضة: enter(frame, tTapSports + 2, 12) },
    hints: 1,
    pressed: { رياضة: span(frame, tTapSports - 2, tTapSports + 10, 4) },
    done: { sub: "ملابس رياضية", p: enter(frame, tTapSub + 2, 10) },
  };
  const s = replaying ? after : before;

  // ---- camera: enlarge the selected detail, then step back for the change and the replay ----------
  const focusState: CategoryState = { ...before, expand: { رجالي: 1 }, hints: 0 };
  const changedState: CategoryState = { ...before, expand: { رجالي: 1 }, hints: 1 };
  const fr = centerOf(rowRect("رياضة", focusState));
  const fc = centerOf(rowRect("رياضة", changedState));
  // enlarge toward the reading start (right): keep the row's right edge inside the viewport
  const zoomS = 1.38;
  const labelFx = rowRect("رياضة", focusState).x + rowRect("رياضة", focusState).w - (CONTENT.w / 2 - 40) / zoomS;
  const shots: Shot[] = [
    { f: 0, s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 },
    { f: tFocus, s: zoomS, fx: labelFx, fy: fr.y, cy: CONTENT.h * 0.36 },
    { f: tChange, s: 1.08, fx: fc.x, fy: fc.y - 120, cy: CONTENT.h * 0.5 },
    { f: tReplay, s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 },
  ];
  const cam = cameraAt(frame, shots);
  const sportsScr = camRect(rowRect("رياضة", s), cam);

  // ---- debugger mode -----------------------------------------------------------------------
  const mode: DebugMode = frame < tPause ? "live" : frame < tInspect ? "paused" : frame < tReplay ? "inspect" : "replay";

  // ---- pointers (content-area screen space) ------------------------------------------------
  const userKeys: Key[] = [
    { f: tUser, x: 560, y: 930 },
    { f: tMen, ...camPoint(centerOf(rowRect("رجالي", before)), cam), click: true },
    { f: tDrift, ...camPoint(centerOf(rowRect("رجالي", before)), cam) },
    { f: tHes, x: 520, y: centerOf(rowRect("رياضة", { ...before, expand: { رجالي: 1 } })).y + 10 },
    { f: tHes + 8, x: 470, y: centerOf(rowRect("رياضة", { ...before, expand: { رجالي: 1 } })).y - 6 },
    { f: tHes + 16, x: 505, y: centerOf(rowRect("رياضة", { ...before, expand: { رجالي: 1 } })).y + 4 },
  ];
  const replayKeys: Key[] = [
    { f: tReplay + 4, x: 600, y: 960 },
    { f: tTapSports, ...centerOf(rowRect("رياضة", { ...after, expand: {} })), click: true },
    { f: tTapSub, ...centerOf(subRect("رياضة", "ملابس رياضية", { ...after, expand: { رياضة: 1 } })), click: true },
  ];
  const hoverAt = camPoint({ x: rowRect("رياضة", focusState).x + rowRect("رياضة", focusState).w - 230, y: fr.y }, cameraAt(tHover, shots));
  const inspectKeys: Key[] = [
    { f: tInspect, x: 820, y: 960 },
    { f: tHover, ...hoverAt },
    { f: tSelect, ...hoverAt, click: true },
    { f: tFocus, ...hoverAt },
    { f: tFocus + T.motion.zoomFrames, ...camPoint({ x: rowRect("رياضة", focusState).x + rowRect("رياضة", focusState).w - 230, y: fr.y }, cameraAt(tFocus + T.motion.zoomFrames, shots)) },
    { f: tChange, ...camPoint({ x: rowRect("رياضة", focusState).x + rowRect("رياضة", focusState).w - 230, y: fr.y }, cameraAt(tChange, shots)) },
    { f: tChange + 20, x: 840, y: 900 },
  ];

  // ---- inspection overlays -------------------------------------------------------------------
  const hover = enter(frame, tHover - 4, 6) * exit(frame, tReplay - 8, 8);
  const selected = enter(frame, tSelect, T.motion.selectFrames) * exit(frame, tReplay - 8, 8);
  const dim = enter(frame, tFocus, T.motion.dimFrames) * exit(frame, tChange, 14);
  const rewind = span(frame, tReplay - 4, tReplay + 6, 4);

  const freeze = span(frame, tPause, tHover + 4, 6); // step 2: the frame visibly holds before inspection
  const overlay = (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.workspace, opacity: freeze * 0.35 }} />
      <FocusDim r={sportsScr} amount={dim} />
      <Selection r={sportsScr} hover={hover} selected={selected} label={frame < tChange ? "اسم القسم" : undefined} />
      <Note anchor={sportsScr} text="«رياضة»: لبس؟ جزم؟ ولا أدوات؟" progress={span(frame, tNote, tInsOpen + 4)} />
      <Inspector title="جوّه القسم ده" rows={[["الاسم", "رياضة"], ["المحتوى", "ملابس • أحذية • أدوات"]]} progress={span(frame, tInsOpen, tInsClose)} />
      <ChangeTag r={sportsScr} text="وصف قصير تحت كل قسم" progress={span(frame, tChange + 10, tTrade + 2)} />
      <Note anchor={sportsScr} text="المقابل: كل صف بقى أطول شوية" progress={span(frame, tTrade, tReplay - 2)} />
      <UserTouch frame={frame} keys={userKeys} from={tUser} to={tInspect + 6} />
      <InspectCursor frame={frame} keys={inspectKeys} from={tInspect} to={tChange + 24} />
      <UserTouch frame={frame} keys={replayKeys} from={tReplay + 4} to={timeline.durationInFrames + 30} />
      <div style={{ position: "absolute", inset: 0, background: C.surface, opacity: rewind * 0.85 }} />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="dukkana.app/categories" illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <CategoryScreen s={s} />
        </div>
      </DebuggerShell>
      {timeline.silent ? (
        <div dir="rtl" style={{ position: "absolute", top: T.layout.captions.y, height: T.layout.captions.h, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
          <span style={{ padding: "10px 24px", borderRadius: T.radius.pill, background: C.surfaceAlt, color: C.textMuted, fontSize: T.type.chip, border: `1px solid ${C.border}` }}>
            {S.labels.visualPreview} · بدون صوت
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
