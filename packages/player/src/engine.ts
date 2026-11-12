// Lesson state machine. Pure functions only: the same code runs in the browser (instant feedback)
// and on the server (scoring). Selecting never judges an answer; only check() does.
import type { ChooseStep, CompareStep, Lesson, MatchStep, Misconception, OrderStep, QuestionStep, SortStep, SpotStep, Step, Text, TuneStep } from "@uxgate/content/types";

export type Answer = { sel: string[]; reason?: string[] };
/** "missed" is a single-try step (skill check, mastery round) answered wrong. */
export type Outcome = "independent" | "supported" | "revealed" | "missed";
/** "saved": a skill-check answer taken without a verdict. "missed": a mastery-round answer that was wrong (verdict shown, no retry). */
export type Phase = "answering" | "wrong" | "main_ok" | "right" | "revealed" | "saved" | "missed";

export type StepState = {
  sel: string[];
  reason: string[];
  /** Options already tried and judged wrong on a single-answer step: dimmed, and they can't be picked again. Absent in older saved lessons. */
  tried?: string[];
  conf: number | null;
  phase: Phase;
  /** Number of Checks that were judged (a compare step's "main answer is right" check is not counted). */
  tries: number;
  hints: number;
  first: Answer | null;
  mc: string | null;
  /** Which entry of the list (the step's misconceptions, or the reason's) was matched. Several entries can share one id, so the id alone is not enough to find the matched text again. */
  mcIdx?: number | null;
  alsoOk: Text | null;
  outcome: Outcome | null;
  xp: number;
};

export type LessonState = {
  lessonId: string;
  hash: string;
  i: number;
  steps: StepState[];
  startedAt: number;
  done: boolean;
};

/** One committed answer, as it is queued and sent to the server. */
export type TryEvent = {
  lessonId: string;
  hash: string;
  stepId: string;
  skill: string;
  tryNo: number;
  kind: "check" | "main_ok" | "reveal";
  answer: Answer;
  correct: boolean;
  hintsUsed: number;
  confidence: number | null;
  misconceptionId: string | null;
  clientTs: number;
};

export const XP = { independent: 10, supported: 5, revealed: 0, missed: 0 } as const;
export const MAX_HINTS = 2;
export const REVEAL_AFTER_TRIES = 3;

export const isQuestion = (s: Step): s is QuestionStep => s.type !== "card" && s.type !== "video";

/** Skill checks and the mastery round give one try per step: no hints, no retry. */
export const isSingleTry = (lesson: Pick<Lesson, "mode">) => lesson.mode === "check" || lesson.mode === "bank";
/** Steps whose answer is built by moving things (not by picking one option). Their `sel` is an encoded list. */
export const isStructured = (s: Step) => s.type === "sort" || s.type === "order" || s.type === "match";
/** Single-answer option steps: choose, words, predict, fix, tune, spot. */
export const isPick = (s: Step) => isQuestion(s) && s.type !== "compare" && !isStructured(s);
export const isMulti = (s: Step) => (s.type === "choose" || s.type === "words" || s.type === "predict" || s.type === "fix") && !!(s as ChooseStep).multi;

/** Encodings kept in `sel`: sort "item:bucket", match "left:right", order the ids top to bottom. */
export const pairOf = (v: string) => { const i = v.indexOf(":"); return [v.slice(0, i), v.slice(i + 1)] as const; };

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, k) => x === b[k]);
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

const newStep = (): StepState => ({ sel: [], reason: [], conf: null, phase: "answering", tries: 0, hints: 0, first: null, mc: null, mcIdx: null, alsoOk: null, outcome: null, xp: 0 });

/** An order step starts in its given order, so Check is available straight away. */
const initialStep = (step: Step): StepState => ({ ...newStep(), sel: step.type === "order" ? step.items.map((it) => it.id) : [] });

export function startLesson(lesson: Lesson, hash: string, now = Date.now()): LessonState {
  return { lessonId: lesson.id, hash, i: 0, steps: lesson.steps.map(initialStep), startedAt: now, done: false };
}

export type Evaluation = { correct: boolean; mainCorrect: boolean; alsoOk: Text | null; misconception: Misconception | null; partial: boolean };

/** Judges one answer against a step. Shared by the client and the server. */
export function evaluate(step: QuestionStep, answer: Answer): Evaluation {
  const sel = answer.sel;
  let mainCorrect: boolean;
  let alsoOk: Text | null = null;
  let mc: Misconception | null = null;
  const whenList = (m: Misconception) => [m.when].flat() as unknown[];
  if (step.type === "compare") {
    mainCorrect = sel[0] === step.answer;
    if (!mainCorrect) mc = (step.misconceptions ?? []).find((m) => whenList(m).includes(sel[0])) ?? null;
  } else if (step.type === "sort") {
    const s = step as SortStep;
    const placed = new Map(sel.map((v) => pairOf(v) as readonly [string, string]));
    mainCorrect = sel.length === s.items.length && s.items.every((it) => s.answer[placed.get(it.id) ?? ""]?.includes(it.id));
    if (!mainCorrect) mc = (s.misconceptions ?? []).find((m) => whenList(m).some((w) => { const x = w as { item: string; bucket: string }; return placed.get(x.item) === x.bucket; })) ?? null;
  } else if (step.type === "order") {
    const s = step as OrderStep;
    mainCorrect = sameList(sel, s.answer);
    const alt = (s.also_ok ?? []).find((a) => sameList(sel, a.answer));
    if (!mainCorrect && alt) { mainCorrect = true; alsoOk = alt.feedback; }
    if (!mainCorrect) mc = (s.misconceptions ?? []).find((m) => whenList(m).some((w) => { const [x, y] = (w as { before: string[] }).before; const a = sel.indexOf(x), b = sel.indexOf(y); return a >= 0 && b >= 0 && a < b; })) ?? null;
  } else if (step.type === "match") {
    const s = step as MatchStep;
    const pairs = new Map(sel.map((v) => pairOf(v) as readonly [string, string]));
    mainCorrect = sel.length === Object.keys(s.answer).length && Object.entries(s.answer).every(([l, r]) => pairs.get(l) === r);
    if (!mainCorrect) mc = (s.misconceptions ?? []).find((m) => whenList(m).some((w) => { const x = w as Record<"left" | "right", string>; return pairs.get(x.left) === x.right; })) ?? null;
  } else {
    const s = step as ChooseStep | TuneStep | SpotStep;
    mainCorrect = sameSet(sel, s.answer);
    const alt = ((s as ChooseStep).also_ok ?? []).find((a) => sameSet(sel, a.answer));
    if (!mainCorrect && alt) { mainCorrect = true; alsoOk = alt.feedback; }
    if (!mainCorrect) mc = (s.misconceptions ?? []).find((m) => whenList(m).some((w) => sel.includes(w as string))) ?? null;
  }
  let correct = mainCorrect;
  let partial = false;
  const reason = step.type === "compare" ? (step as CompareStep).reason : undefined;
  if (mainCorrect && reason) {
    const ok = sameSet(answer.reason ?? [], reason.answer);
    if (!ok) {
      correct = false; partial = true;
      mc = (reason.misconceptions ?? []).find((m) => [m.when].flat().some((w) => (answer.reason ?? []).includes(w))) ?? null;
    }
  }
  return { correct, mainCorrect, alsoOk, misconception: mc, partial };
}

/** Where the judged misconception sits in the list it came from (the reason list for a wrong reason, otherwise the step's). */
export function misconceptionIndex(step: QuestionStep, judged: Evaluation): number | null {
  if (!judged.misconception) return null;
  const reason = step.type === "compare" ? (step as CompareStep).reason : undefined;
  const list = judged.partial ? reason?.misconceptions : step.misconceptions;
  const i = (list ?? []).indexOf(judged.misconception);
  return i >= 0 ? i : null;
}

const hasReason = (step: Step): step is CompareStep => step.type === "compare" && !!step.reason;

export const canSelect = (st: StepState) => st.phase === "answering" || st.phase === "main_ok";
/** Sort needs every item placed and match every left item paired; order always has a full list. */
export const isComplete = (step: Step, sel: string[]) =>
  step.type === "sort" ? sel.length === step.items.length : step.type === "match" ? sel.length === step.left.length : sel.length > 0;
export const canCheck = (step: Step, st: StepState) =>
  isQuestion(step) && (step.confidence && st.conf === null && st.phase === "answering" ? false : true) && (st.phase === "answering" ? isComplete(step, st.sel) : st.phase === "main_ok" ? st.reason.length > 0 : false);

const withStep = (state: LessonState, i: number, patch: Partial<StepState>): LessonState => ({
  ...state,
  steps: state.steps.map((s, k) => (k === i ? { ...s, ...patch } : s)),
});

export function select(lesson: Lesson, state: LessonState, optionId: string): LessonState {
  const step = lesson.steps[state.i]; const st = state.steps[state.i];
  if (!isQuestion(step) || st.phase !== "answering") return state;
  if ((st.tried ?? []).includes(optionId)) return state;
  if (isStructured(step)) return state;
  const multi = isMulti(step);
  const sel = multi ? (st.sel.includes(optionId) ? st.sel.filter((x) => x !== optionId) : [...st.sel, optionId]) : [optionId];
  return withStep(state, state.i, { sel });
}

/** Sets the whole answer of a sort, order or match step (the screen builds the encoded list). Never judged here. */
export function setSelection(lesson: Lesson, state: LessonState, sel: string[]): LessonState {
  const step = lesson.steps[state.i]; const st = state.steps[state.i];
  if (!isQuestion(step) || !isStructured(step) || st.phase !== "answering") return state;
  return withStep(state, state.i, { sel });
}

export function selectReason(lesson: Lesson, state: LessonState, optionId: string): LessonState {
  const st = state.steps[state.i];
  if (st.phase !== "main_ok") return state;
  return withStep(state, state.i, { reason: [optionId] });
}

export function setConfidence(state: LessonState, level: number): LessonState {
  const st = state.steps[state.i];
  if (st.phase === "right" || st.phase === "revealed") return state;
  return withStep(state, state.i, { conf: level });
}

export type Transition = { state: LessonState; event?: TryEvent };

export function check(lesson: Lesson, state: LessonState, now = Date.now()): Transition {
  const step = lesson.steps[state.i]; const st = state.steps[state.i];
  if (!isQuestion(step) || !canCheck(step, st)) return { state };
  const answer: Answer = { sel: st.sel, ...(hasReason(step) && st.phase === "main_ok" ? { reason: st.reason } : {}) };
  const ev = evaluate(step, hasReason(step) && st.phase === "answering" ? { sel: st.sel, reason: step.reason!.answer } : answer);
  const first = st.first ?? { sel: st.sel };
  const base = { lessonId: lesson.id, hash: state.hash, stepId: step.id, skill: step.skill, hintsUsed: st.hints, confidence: st.conf, clientTs: now };

  // A compare step with a reason: a right main answer opens the reason question and is not yet a judged try.
  if (hasReason(step) && st.phase === "answering" && ev.mainCorrect) {
    const event: TryEvent = { ...base, tryNo: st.tries, kind: "main_ok", answer: { sel: st.sel }, correct: false, misconceptionId: null };
    return { state: withStep(state, state.i, { phase: "main_ok", first }), event };
  }

  const judged = evaluate(step, answer);
  const tries = st.tries + 1;
  const event: TryEvent = { ...base, tryNo: tries, kind: "check", answer, correct: judged.correct, misconceptionId: judged.misconception?.id ?? null };
  // Skill check: the answer is taken without a verdict and cannot be changed. Mastery round: one try, with a verdict.
  if (lesson.mode === "check") {
    const outcome: Outcome = judged.correct ? "independent" : "missed";
    return { state: withStep(state, state.i, { phase: "saved", tries, first, outcome, xp: XP[outcome], mc: null, alsoOk: null }), event };
  }
  if (lesson.mode === "bank") {
    if (judged.correct) return { state: withStep(state, state.i, { phase: "right", tries, first, outcome: "independent", xp: XP.independent, alsoOk: judged.alsoOk, mc: null }), event };
    return { state: withStep(state, state.i, { phase: "missed", tries, first, outcome: "missed", xp: 0, mc: judged.misconception?.id ?? null, mcIdx: misconceptionIndex(step, judged), alsoOk: null }), event };
  }
  if (judged.correct) {
    const outcome: Outcome = tries === 1 && st.hints === 0 ? "independent" : "supported";
    return { state: withStep(state, state.i, { phase: "right", tries, first, outcome, xp: XP[outcome], alsoOk: judged.alsoOk, mc: null }), event };
  }
  // A wrong reason sends the learner back to the reason question; a wrong main answer back to the options.
  return { state: withStep(state, state.i, { phase: "wrong", tries, first, mc: judged.misconception?.id ?? null, mcIdx: misconceptionIndex(step, judged), alsoOk: null }), event };
}

export const hintsAvailable = (step: Step) => (isQuestion(step) ? Math.min(MAX_HINTS, step.hints?.length ?? 0) : 0);
/** Hints end once Show the answer is offered (after the third try), so the sheet keeps two buttons. */
export const canHint = (step: Step, st: StepState, lesson?: Pick<Lesson, "mode">) => !(lesson && isSingleTry(lesson)) && st.phase === "wrong" && st.tries < REVEAL_AFTER_TRIES && st.hints < hintsAvailable(step);
export const canReveal = (st: StepState) => st.phase === "wrong" && st.tries >= REVEAL_AFTER_TRIES;

export function hint(lesson: Lesson, state: LessonState): LessonState {
  const step = lesson.steps[state.i]; const st = state.steps[state.i];
  return canHint(step, st, lesson) ? withStep(state, state.i, { hints: st.hints + 1 }) : state;
}

export function retry(lesson: Lesson, state: LessonState): LessonState {
  const step = lesson.steps[state.i]; const st = state.steps[state.i];
  if (st.phase !== "wrong") return state;
  // After a wrong reason the learner stays on the reason question.
  if (st.reason.length) return withStep(state, state.i, { phase: "main_ok", reason: [] });
  // After a wrong main answer the choice is cleared. On a single-answer step the option just tried is dimmed for good.
  if (isStructured(step)) return withStep(state, state.i, { phase: "answering", sel: step.type === "order" ? st.sel : [], reason: [] });
  const single = isQuestion(step) && !isMulti(step);
  return withStep(state, state.i, { phase: "answering", sel: [], reason: [], tried: single ? [...(st.tried ?? []), ...st.sel] : st.tried ?? [] });
}

export function reveal(lesson: Lesson, state: LessonState, now = Date.now()): Transition {
  const step = lesson.steps[state.i]; const st = state.steps[state.i];
  if (!isQuestion(step) || !canReveal(st)) return { state };
  const event: TryEvent = {
    lessonId: lesson.id, hash: state.hash, stepId: step.id, skill: step.skill, tryNo: st.tries, kind: "reveal",
    answer: { sel: st.sel }, correct: false, hintsUsed: st.hints, confidence: st.conf, misconceptionId: null, clientTs: now,
  };
  return { state: withStep(state, state.i, { phase: "revealed", outcome: "revealed", xp: XP.revealed }), event };
}

export const isFinished = (step: Step, st: StepState) => !isQuestion(step) || st.phase === "right" || st.phase === "revealed" || st.phase === "saved" || st.phase === "missed";

export function advance(lesson: Lesson, state: LessonState): LessonState {
  if (!isFinished(lesson.steps[state.i], state.steps[state.i])) return state;
  if (state.i >= lesson.steps.length - 1) return { ...state, done: true };
  return { ...state, i: state.i + 1 };
}

export type Summary = { xp: number; questions: number; independent: number; supported: number; revealed: number; missed: number };

/** `xpFactor` turns each question's XP into what the learner earns (replays pay half, rounded down, or nothing). */
export function summarize(lesson: Lesson, state: LessonState, xpFactor: (amount: number) => number = (n) => n): Summary {
  const out: Summary = { xp: 0, questions: 0, independent: 0, supported: 0, revealed: 0, missed: 0 };
  lesson.steps.forEach((s, k) => {
    if (!isQuestion(s)) return;
    out.questions++;
    const o = state.steps[k].outcome;
    if (o) { out[o]++; out.xp += xpFactor(XP[o]); }
  });
  return out;
}

/**
 * Server-side scoring of one step from its stored events (ordered by tryNo). The client never decides XP.
 * "main_ok" events are not judged tries. The first answer is the first event of any kind.
 */
export function scoreStep(step: QuestionStep, events: Pick<TryEvent, "kind" | "answer" | "hintsUsed" | "tryNo">[], singleTry = false): { outcome: Outcome | null; xp: number; tries: number; correct: boolean[] } {
  const checks = events.filter((e) => e.kind === "check");
  const correct = checks.map((e) => evaluate(step, e.answer).correct);
  // Skill check and mastery round: the first judged answer is the only one that counts, right or wrong.
  if (singleTry) {
    if (!checks.length) return { outcome: null, xp: 0, tries: 0, correct };
    const outcome: Outcome = correct[0] ? "independent" : "missed";
    return { outcome, xp: XP[outcome], tries: 1, correct: [correct[0]] };
  }
  const hints = Math.min(MAX_HINTS, Math.max(0, ...events.map((e) => e.hintsUsed)));
  const win = correct.indexOf(true);
  let outcome: Outcome | null = null;
  if (win >= 0) outcome = win === 0 && hints === 0 ? "independent" : "supported";
  else if (events.some((e) => e.kind === "reveal") && checks.length >= REVEAL_AFTER_TRIES) outcome = "revealed";
  return { outcome, xp: outcome ? XP[outcome] : 0, tries: checks.length, correct };
}

/** The misconception to show for a missed or wrong step. Uses the stored index, because several entries can share one id (the same mistake behind different options); falls back to the id for state saved before the index existed. */
export function matchedMisconception<M extends { id: string }>(list: readonly M[] | undefined, st: { mc: string | null; mcIdx?: number | null }): M | undefined {
  if (!list || !st.mc) return undefined;
  const at = st.mcIdx != null ? list[st.mcIdx] : undefined;
  return at && at.id === st.mc ? at : list.find((m) => m.id === st.mc);
}
