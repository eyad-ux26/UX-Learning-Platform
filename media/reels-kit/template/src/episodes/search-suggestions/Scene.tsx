import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, CONTENT, T } from "../../brand/theme";
import { cameraAt, camRect, camStyle, Rect, Shot } from "../../debugger/camera";
import { DebuggerShell, DebugMode } from "../../debugger/DebuggerShell";
import { FocusDim, Inspector, Note, ScanPath, Selection, Tag } from "../../debugger/Inspect";
import { UserTouch } from "../../debugger/Pointers";
import {
  EmphasisCompare, Emph, fieldRect, keyboardRect, partRects, Results, Row, rowRect, SearchScreen, SearchState, Seg, segRect, ZWJ,
} from "../../demo/SearchScreen";
import { cueFrame, enter, exit, Key, span } from "../../lib/timeline";
import { SceneProps } from "../registry";

/*
 * «هتحلها ازاي؟» — Search suggestions: which part gets the bold (illustrative shop «رَفّ»).
 * Hook: every suggestion starts with the bold «قهوة» → the story → pause/inspect: the eye reads «قهوة» three times,
 * while the differences are تركي / اسبريسو / سريعة التحضير → turn «طيب هتحلها ازاي؟» → prefix completions: bold the
 * addition → mixed positions: bold the match itself → partial-word match («شيرت» in «سويتشيرت») → the rule by
 * suggestion type → relevance of results → short list and keyboard space → closing A/B: bold or colour.
 */
const S = (...parts: (string | [string])[]): Seg[] => parts.map((p) => (Array.isArray(p) ? { t: p[0], m: true } : { t: p }));
const Q = "قهوة";
const PREFIX: Seg[][] = [S([Q], " تركي"), S([Q], " اسبريسو"), S([Q], " سريعة التحضير")];
const MIXED: Seg[][] = [...PREFIX, S("ماكينة ", [Q], " كبسولات"), S("كبسولات ", [Q], " اسبريسو")];
const SHIRT: Seg[][] = [S("سويت" + ZWJ, [ZWJ + "شيرت"]), S("تي" + ZWJ, [ZWJ + "شيرت"], " أبيض"), S(["شيرت"], " كاروهات")];
const CROWD: Seg[][] = [
  S([Q], " تركي"), S([Q], " تركي محوّجة"), S([Q], " تركي سادة"), S([Q], " اسبريسو"),
  S([Q], " اسبريسو حبوب"), S([Q], " اسبريسو مطحونة"), S([Q], " سريعة التحضير"), S([Q], " سريعة التحضير 3 في 1"),
];
const CONCISE: Seg[][] = [S([Q], " تركي"), S([Q], " اسبريسو"), S([Q], " سريعة التحضير"), S([Q], " باللبن")];
const CLOSING: Seg[][] = [S([Q], " اسبريسو"), S("ماكينة ", [Q], " كبسولات"), S("كبسولات ", [Q], " اسبريسو")];

/** Text typed so far: reveals `text` character by character between frames a and b. */
const typed = (frame: number, text: string, a: number, b: number) => {
  const n = Math.round(interpolate(frame, [a, b], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return text.slice(0, n);
};

export const SearchSuggestionsScene: React.FC<SceneProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const c = (id: string) => cueFrame(timeline, id);
  const ids = [
    "open", "hookType", "hookList", "hookQ", "hookBold", "story", "type", "s1", "s2", "s3", "phrases", "pick", "runSearch", "pause", "eye", "repeat",
    "diff", "dT", "dE", "dS", "turn", "prefixCase", "fromEnd", "highlightNew", "plain", "boldRest", "compare", "compare2", "mixed", "m1", "m2",
    "anywhere", "moves", "better", "matchBold", "relate", "notice", "partial", "typeShirt", "sweat", "partBold", "partWord", "rule", "whole",
    "patterns", "complete", "discover", "btw", "relevant", "otherwise", "concise", "kb", "crowd", "trim", "focusInfo", "choice", "optA", "optB", "cta", "next",
  ] as const;
  const B = Object.fromEntries(ids.map((id) => [id, c(id)])) as Record<(typeof ids)[number], number>;
  const blink = Math.floor(frame / 15) % 2 === 0;

  // ---- product state --------------------------------------------------------------------------------
  const rowsOf = (list: Seg[][], appear: number[], press: number[] = []): Row[] =>
    list.map((segs, i) => ({ segs, p: appear[i] ?? 1, press: press[i] ?? 0 }));
  const base = (over: Partial<SearchState>): SearchState => ({ query: Q, caret: false, rows: [], emphA: "match", emphB: "match", emphT: 0, keyboard: 1, ...over });
  const results = (query: string, items: Results["items"], p: number, offP = 0): Results => ({ query, items, p, offP });
  const GOOD_1 = [{ name: "بن اسبريسو مطحون" }, { name: "بن اسبريسو حبوب" }, { name: "قهوة اسبريسو دارك" }, { name: "بن اسبريسو ديكاف" }];
  const GOOD_2 = [{ name: "كبسولات اسبريسو 10 قطع" }, { name: "كبسولات اسبريسو إنتنس" }, { name: "كبسولات اسبريسو ديكاف" }, { name: "كبسولات اسبريسو لونجو" }];
  const OFF_2 = [{ name: "مج قهوة سيراميك", off: true }, { name: "فلاتر قهوة ورق", off: true }, { name: "سكر بني", off: true }, { name: "ماكينة طحن", off: true }];

  const stateAt = (f: number): SearchState => {
    if (f < B.story) {
      const q = typed(f, Q, B.hookType + 18, B.hookList - 6);
      return base({ query: q, caret: blink, rows: rowsOf(PREFIX, [0, 1, 2].map((i) => enter(f, B.hookList + i * 4, 10))) });
    }
    if (f < B.pause) {
      const q = typed(f, Q, B.type + 22, B.s1 - 26);
      const res = span(f, B.runSearch - 6, B.pause - 2, 10);
      return base({
        query: q, caret: blink && f < B.pick,
        rows: rowsOf(PREFIX, [enter(f, B.s1 - 2, 10), enter(f, B.s2 - 2, 10), enter(f, B.s3 - 2, 10)], [0, span(f, B.pick - 3, B.pick + 10, 4), 0]),
        results: res > 0 ? results("قهوة اسبريسو", GOOD_1, res) : undefined,
      });
    }
    if (f < B.mixed) {
      return base({ rows: rowsOf(PREFIX, [1, 1, 1]), emphA: "match", emphB: "rest", emphT: interpolate(f, [B.plain, B.boldRest + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) });
    }
    if (f < B.partial) {
      return base({ rows: rowsOf(MIXED, [1, 1, 1, enter(f, B.m1 - 2, 12), enter(f, B.m2 - 2, 12)]), emphA: "rest", emphB: "match", emphT: interpolate(f, [B.matchBold, B.matchBold + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) });
    }
    if (f < B.btw) {
      const shirt = f >= B.typeShirt;
      const q = shirt ? typed(f, "شيرت", B.typeShirt + 4, B.typeShirt + 18) : Q;
      return base({
        query: q, caret: blink && f < B.sweat,
        rows: shirt ? rowsOf(SHIRT, [0, 1, 2].map((i) => enter(f, B.sweat - 4 + i * 4, 10))) : rowsOf(MIXED, [1, 1, 1, 1, 1].map(() => exit(f, B.typeShirt - 6, 8))),
        emphA: shirt ? "none" : "match", emphB: "match", emphT: shirt ? interpolate(f, [B.partBold, B.partBold + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
      });
    }
    if (f < B.concise) {
      const back = enter(f, B.btw, 10);
      const res = span(f, B.relevant + 10, B.concise + 6, 10);
      const bad = f >= B.otherwise + 4;
      return base({
        rows: rowsOf(MIXED, [back, back, back, back, back], [0, 0, 0, 0, span(f, B.relevant - 2, B.relevant + 12, 4)]),
        results: res > 0 ? results("كبسولات قهوة اسبريسو", bad ? OFF_2 : GOOD_2, res, bad ? enter(f, B.otherwise + 4, 10) : 0) : undefined,
      });
    }
    // concise list vs. a crowded one (prefix suggestions → the addition is bold)
    const crowded = f >= B.crowd && f < B.trim;
    const list = crowded ? CROWD : CONCISE;
    const appear = list.map((_, k) => (crowded ? enter(f, B.crowd + k * 2, 8) : f < B.crowd ? enter(f, B.concise + k * 3, 8) : enter(f, B.trim + k * 2, 8)));
    return base({ rows: rowsOf(list, appear), emphA: "rest", emphB: "rest" });
  };
  const s = stateAt(frame);

  // ---- camera ----------------------------------------------------------------------------------------
  const rightFx = (sc: number) => CONTENT.w - 28 - (CONTENT.w / 2 - 30) / sc;
  const shots: Shot[] = [
    { f: 0, s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 },
    { f: B.diff, s: 1.22, fx: rightFx(1.22), fy: 290, cy: CONTENT.h * 0.34 },
    { f: B.turn, s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 },
    { f: B.partBold, s: 1.3, fx: rightFx(1.3), fy: 260, cy: CONTENT.h * 0.32 },
    { f: B.rule, s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 },
  ];
  const cam = cameraAt(frame, shots);
  const R = (r: Rect) => camRect(r, cam);
  const RS = (rs: Rect[]) => rs.map(R);

  // ---- debugger mode -----------------------------------------------------------------------------------
  const MODES: [number, DebugMode][] = [
    [0, "live"], [B.hookQ, "inspect"], [B.story, "live"], [B.pause, "paused"], [B.pause + 8, "inspect"], [B.turn, "change"],
    [B.compare, "replay"], [B.mixed, "inspect"], [B.better, "change"], [B.relate, "replay"], [B.partial, "change"], [B.rule, "inspect"],
    [B.btw, "live"], [B.relevant + 20, "inspect"], [B.concise, "inspect"], [B.choice, "compare"],
  ];
  const mode = MODES.filter(([f]) => frame >= f).pop()![1];

  // ---- geometry helpers (content coords) ---------------------------------------------------------------
  const emphNow: Emph = s.emphT >= 0.5 ? s.emphB : s.emphA;
  const matches = (list: Seg[][], e: Emph = emphNow) => list.flatMap((segs, i) => partRects(i, segs, e, true));
  const rests = (list: Seg[][], e: Emph = emphNow) => list.map((segs, i) => partRects(i, segs, e, false)).map((rs) => unionX(rs));
  const unionX = (rs: Rect[]): Rect => {
    const x0 = Math.min(...rs.map((r) => r.x)), x1 = Math.max(...rs.map((r) => r.x + r.w));
    return { x: x0, y: rs[0].y, w: x1 - x0, h: rs[0].h };
  };
  const listRect = (n: number): Rect => ({ x: rowRect(0).x, y: rowRect(0).y, w: rowRect(0).w, h: rowRect(0).h * n });
  const queryRect: Rect = { x: fieldRect.x + fieldRect.w - 26 - 36 - 16 - 104, y: fieldRect.y + 18, w: 104, h: fieldRect.h - 36 };

  // ---- pointers ------------------------------------------------------------------------------------------
  const pickPt = { x: rowRect(1).x + rowRect(1).w - 300, y: rowRect(1).y + 46 };
  const relPt = { x: rowRect(4).x + rowRect(4).w - 300, y: rowRect(4).y + 46 };
  const storyTouch: Key[] = [{ f: B.phrases, x: 560, y: 560 }, { f: B.pick, ...pickPt, click: true }, { f: B.runSearch + 10, ...pickPt }];
  const relTouch: Key[] = [{ f: B.btw + 10, x: 560, y: 600 }, { f: B.relevant, ...relPt, click: true }, { f: B.relevant + 24, ...relPt }];
  const typeTouch: Key[] = [{ f: B.hookType, x: 560, y: 760 }, { f: B.hookType + 18, x: 540, y: 720, click: true }, { f: B.hookList, x: 420, y: 760, click: true }];

  // ---- overlays -------------------------------------------------------------------------------------------
  const freeze = span(frame, B.pause, B.pause + 22, 6) + span(frame, B.turn, B.turn + 22, 6) + span(frame, B.better, B.better + 20, 6);
  const rewind = span(frame, B.story - 4, B.story + 6, 4) + span(frame, B.btw - 4, B.btw + 6, 4);
  const inR = (a: number, b: number) => frame >= a && frame < b;
  const compareP = enter(frame, B.choice, 16);

  const overlay = (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.workspace, opacity: Math.min(1, freeze) * 0.35 }} />

      {/* hook: the repeated word is the bold one */}
      {inR(B.hookQ, B.story + 4)
        ? RS(matches(PREFIX, "match")).map((r, i) => <Selection key={i} r={r} pad={2} hover={span(frame, B.hookBold - 6 + i * 3, B.story)} selected={0} />)
        : null}

      {/* inspect: the eye reads the same word three times; the differences are elsewhere */}
      {inR(B.pause, B.turn + 6) ? (
        <>
          <FocusDim r={R(listRect(3))} amount={enter(frame, B.diff, T.motion.dimFrames) * exit(frame, B.turn, 12)} pad={6} />
          {RS(matches(PREFIX, "match")).map((r, i) => (
            <Selection key={"m" + i} r={r} pad={2} hover={span(frame, B.pause + 8 + i * 3, B.diff)} selected={0} />
          ))}
          <ScanPath rects={RS(matches(PREFIX, "match"))} progress={span(frame, B.eye, B.diff) * interpolate(frame, [B.eye, B.eye + 24], [0, 1], { extrapolateRight: "clamp" })} />
          <Note anchor={R(listRect(3))} text="العين بتقرا: قهوة · قهوة · قهوة" progress={span(frame, B.repeat - 4, B.diff + 2)} />
          {RS(rests(PREFIX, "match")).map((r, i) => (
            <Selection key={"r" + i} r={r} pad={2} hover={0} selected={enter(frame, [B.dT, B.dE, B.dS][i], T.motion.selectFrames) * exit(frame, B.turn, 10)} />
          ))}
          <Note anchor={R(listRect(3))} text="اللي بيفرّق الاختيارات" progress={span(frame, B.dS + 6, B.turn + 4)} />
        </>
      ) : null}

      {/* change 1: prefix completions → bold the addition */}
      {inR(B.turn, B.mixed + 6) ? (
        <>
          <Selection r={R(queryRect)} pad={2} hover={span(frame, B.prefixCase, B.highlightNew)} selected={0} label="اللي اتكتب" labelSide="left" />
          {RS(matches(PREFIX, "match")).map((r, i) => <Selection key={"pm" + i} r={r} pad={2} hover={span(frame, B.prefixCase + 6, B.highlightNew)} selected={0} />)}
          <Note anchor={R(listRect(3))} text="الاقتراح = اللي اتكتب + إضافة" progress={span(frame, B.fromEnd, B.plain)} />
          {RS(rests(PREFIX, "rest")).map((r, i) => (
            <Selection key={"pr" + i} r={r} pad={2} hover={span(frame, B.highlightNew + i * 3, B.plain)} selected={span(frame, B.boldRest, B.compare, 8)} />
          ))}
          <Tag r={R(rowRect(0))} x={R(rowRect(0)).x + 70} text="+ البولد على الإضافة" progress={span(frame, B.boldRest + 6, B.compare + 4)} />
          <ScanPath rects={RS(rests(PREFIX, "rest"))} progress={span(frame, B.compare + 4, B.mixed) * interpolate(frame, [B.compare + 4, B.compare + 28], [0, 1], { extrapolateRight: "clamp" })} />
          <Note anchor={R(listRect(3))} text="العين بتقرا: تركي · اسبريسو · سريعة التحضير" progress={span(frame, B.compare2 - 6, B.mixed + 2)} />
        </>
      ) : null}

      {/* change 2: the match moves inside the suggestion → bold the match itself */}
      {inR(B.mixed, B.partial + 6) ? (
        <>
          {RS(matches(MIXED, "rest")).map((r, i) => (
            <Selection key={"mm" + i} r={r} pad={2} hover={span(frame, B.anywhere + i * 3, B.better)} selected={0} />
          ))}
          <ScanPath rects={RS(matches(MIXED, "rest"))} progress={span(frame, B.moves, B.better) * interpolate(frame, [B.moves, B.moves + 24], [0, 1], { extrapolateRight: "clamp" })} />
          <Note anchor={R(listRect(5))} text="مكان «قهوة» بيتغيّر من سطر لسطر" progress={span(frame, B.moves + 4, B.better + 2)} />
          {RS(matches(MIXED, "match")).map((r, i) => (
            <Selection key={"mb" + i} r={r} pad={2} hover={0} selected={span(frame, B.matchBold + 4 + i * 2, B.partial, 8)} />
          ))}
          <Tag r={R(rowRect(3))} x={R(rowRect(3)).x + 70} text="+ البولد على المطابقة" progress={span(frame, B.matchBold + 10, B.relate + 6)} />
          <Selection r={R(queryRect)} pad={2} hover={0} selected={span(frame, B.relate, B.partial)} label="اللي اتكتب" labelSide="left" />
          <Note anchor={R(listRect(5))} text="المطابقة باينة في كل سطر" progress={span(frame, B.notice, B.partial + 2)} />
        </>
      ) : null}

      {/* change 3: the match is part of a word */}
      {inR(B.sweat, B.rule + 6) ? (
        <Selection r={R(segRect(0, SHIRT[0], 1, "match"))} pad={2} hover={0} selected={span(frame, B.partWord - 4, B.rule + 2)} label="جزء من كلمة" labelSide="left" />
      ) : null}

      {/* the rule follows the type of suggestions */}
      {inR(B.rule, B.btw + 6) ? (
        <>
          <Selection r={R(listRect(3))} pad={-2} hover={span(frame, B.whole, B.patterns + 6)} selected={0} />
          <Inspector title="القرار حسب نوع الاقتراحات" rows={[["بيكمّل اللي اتكتب", "البولد على الإضافة"], ["الكلمة في أي مكان", "البولد على المطابقة"]]} progress={span(frame, B.rule + 4, B.btw + 4, 14)} />
          <Note anchor={R(listRect(3))} text="Search Patterns" source="يكمّل عبارة بدأها؟ ولا يتعرّف على اقتراحات مرتبطة؟" progress={span(frame, B.patterns + 4, B.btw)} />
        </>
      ) : null}

      {/* relevance: emphasis helps choosing, results must still fit */}
      {inR(B.relevant, B.concise + 6) ? (
        <>
          <Tag r={{ x: 28, y: 146, w: 300, h: 40 }} x={40} text="✓ نتايج مناسبة" progress={span(frame, B.relevant + 24, B.otherwise + 2)} />
          <Tag r={{ x: 28, y: 146, w: 300, h: 40 }} x={40} tone="warn" text="نتايج مش مناسبة" progress={span(frame, B.otherwise + 10, B.concise + 4)} />
        </>
      ) : null}

      {/* short list + keyboard space */}
      {inR(B.concise, B.choice + 6) ? (
        <>
          <Selection r={R(keyboardRect)} pad={-6} hover={0} selected={span(frame, B.kb + 6, B.crowd)} label="مساحة الكيبورد" labelSide="left" />
          <Tag r={R(rowRect(1))} x={R(rowRect(1)).x + 70} tone="warn" text="اقتراحات متشابهة" progress={span(frame, B.crowd + 10, B.trim)} />
          <Tag r={R({ x: 0, y: keyboardRect.y - 52, w: 400, h: 40 })} x={R(keyboardRect).x + 98} tone="warn" text="+3 مستخبيين ورا الكيبورد" progress={span(frame, B.crowd + 16, B.trim)} />
          <Tag r={R(rowRect(3))} x={R(rowRect(3)).x + 70} text="+ قايمة أقصر ومختلفة" progress={span(frame, B.trim + 8, B.focusInfo + 12)} />
          <Note anchor={R(listRect(4))} text="المعلومة المهمة الأول، وبعدين البولد" progress={span(frame, B.focusInfo + 6, B.choice + 2)} />
        </>
      ) : null}

      {/* pointers */}
      <UserTouch frame={frame} keys={typeTouch} from={B.hookType} to={B.hookList + 8} />
      <UserTouch frame={frame} keys={storyTouch} from={B.phrases} to={B.runSearch + 12} />
      <UserTouch frame={frame} keys={relTouch} from={B.btw + 10} to={B.relevant + 26} />

      {/* closing comparison */}
      {compareP > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: compareP }}>
          <EmphasisCompare rows={CLOSING} a={enter(frame, B.choice + 6, 14)} b={enter(frame, B.choice + 14, 14)} selA={span(frame, B.optA, B.optB)} selB={span(frame, B.optB, B.cta)} cta={enter(frame, B.cta, 14)} />
        </div>
      ) : null}

      <div style={{ position: "absolute", inset: 0, background: C.surface, opacity: Math.min(1, rewind) * 0.85 }} />
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address="raff.shop/search" illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <SearchScreen s={s} />
        </div>
      </DebuggerShell>
    </AbsoluteFill>
  );
};
