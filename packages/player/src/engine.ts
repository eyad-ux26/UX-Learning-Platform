// Lesson state machine. Pure functions only: the same code runs in the browser (instant feedback)
// and on the server (scoring). Selecting never judges an answer; only check() does.
import type { ChooseStep, CompareStep, Lesson, Misconception, QuestionStep, Step, Text, TuneStep } from "@uxgate/content/types";

export type Answer = { sel: string[]; reason?: string[] };
export type Outcome = "independent" | "supported" | "revealed";
export type Phase = "answering" | "wrong" | "main_ok" | "right" | "revealed";

export type StepState = {
  sel: string[];
  reason: string[];
  conf: number | null;
  phase: Phase;
  /** Number of Checks that were judged (a compare step's "main answer is right" check is not counted). */
  tries: number;
  hints: number;
  first: Answer | null;
  mc: string | null;
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

export const XP = { independent: 10, supported: 5, revealed: 0 } as const;
export const MAX_HINTS = 2;
export const REVEAL_AFTER_TRIES = 3;

export const isQuestion = (s: Step): s is QuestionStep => s.type !== "card";

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

const newStep = (): StepState => ({ sel: [], reason: [], conf: null, phase: "answering", tries: 0, hints: 0, first: null, mc: null, alsoOk: null, outcome: null, xp: 0 });

export function startLesson(lesson: Lesson, hash: string, now = Date.now()): LessonState {
  return { lessonId: lesson.id, hash, i: 0, steps: lesson.steps.map(newStep), startedAt: now, done: false };
}

export type Evaluation = { correct: boolean; mainCorrect: boolean; alsoOk: Text | null; misconception: Misconception | null; partial: boolean };

/** Judges one answer against a step. Shared by the client and the server. */
export function evaluate(step: QuestionStep, answer: Answer): Evaluation {
  const sel = answer.sel;
  let mainCorrect: boolean;
  let alsoOk: Text | null = null;
  let mc: Misconception | null = null;
  if (step.type === "compare") {
    mainCorrect = sel[0] === step.answer;
    if (!mainCorrect) mc = (step.misconceptions ?? []).find((m) => [m.when].flat().includes(sel[0])) ?? null;
  } else {
    const s = step as ChooseStep | TuneStep;
    mainCorrect = sameSet(sel, s.answer);
    const alt = (s.also_ok ?? []).find((a) => sameSet(sel, a.answer));
    if (!mainCorrect && alt) { mainCorrect = true; alsoOk = alt.feedback; }
    if (!mainCorrect) mc = (s.misconceptions ?? []).find((m) => [m.when].flat().some((w) => sel.includes(w))) ?? null;
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

const hasReason = (step: Step): step is CompareStep => step.type === "compare" && !!step.reason;

export const canSelect = (st: StepState) => st.phase === "answering" || st.phase === "main_ok";
export const canCheck = (step: Step, st: StepState) =>
  isQuestion(step) && (st.phase === "answering" ? st.sel.length > 0 : st.phase === "main_ok" ? st.reason.length > 0 : false);

const withStep = (state: LessonState, i: number, patch: Partial<StepState>): LessonState => ({
  ...state,
  steps: state.steps.map((s, k) => (k === i ? { ...s, ...patch } : s)),
});

export function select(lesson: Lesson, state: LessonState, optionId: string): LessonState {
  const step = lesson.steps[state.i]; const st = state.steps[state.i];
  if (!isQuestion(step) || st.phase !== "answering") return state;
  const multi = step.type === "choose" && step.multi;
  const sel = multi ? (st.sel.includes(optionId) ? st.sel.filter((x) => x !== optionId) : [...st.sel, optionId]) : [optionId];
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
  if (judged.correct) {
    const outcome: Outcome = tries === 1 && st.hints === 0 ? "independent" : "supported";
    return { state: withStep(state, state.i, { phase: "right", tries, first, outcome, xp: XP[outcome], alsoOk: judged.alsoOk, mc: null }), event };
  }
  // A wrong reason sends the learner back to the reason question; a wrong main answer back to the options.
  return { state: withStep(state, state.i, { phase: "wrong", tries, first, mc: judged.misconception?.id ?? null, alsoOk: null }), event };
}

export const hintsAvailable = (step: Step) => (isQuestion(step) ? Math.min(MAX_HINTS, step.hints?.length ?? 0) : 0);
export const canHint = (step: Step, st: StepState) => st.phase === "wrong" && st.hints < hintsAvailable(step);
export const canReveal = (st: StepState) => st.phase === "wrong" && st.tries >= REVEAL_AFTER_TRIES;

export function hint(lesson: Lesson, state: LessonState): LessonState {
  const step = lesson.steps[state.i]; const st = state.steps[state.i];
  return canHint(step, st) ? withStep(state, state.i, { hints: st.hints + 1 }) : state;
}

export function retry(state: LessonState): LessonState {
  const st = state.steps[state.i];
  if (st.phase !== "wrong") return state;
  // After a wrong reason the learner stays on the reason question.
  return withStep(state, state.i, { phase: st.reason.length ? "main_ok" : "answering", reason: [] });
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

export const isFinished = (step: Step, st: StepState) => !isQuestion(step) || st.phase === "right" || st.phase === "revealed";

export function advance(lesson: Lesson, state: LessonState): LessonState {
  if (!isFinished(lesson.steps[state.i], state.steps[state.i])) return state;
  if (state.i >= lesson.steps.length - 1) return { ...state, done: true };
  return { ...state, i: state.i + 1 };
}

export type Summary = { xp: number; questions: number; independent: number; supported: number; revealed: number };

export function summarize(lesson: Lesson, state: LessonState): Summary {
  const out: Summary = { xp: 0, questions: 0, independent: 0, supported: 0, revealed: 0 };
  lesson.steps.forEach((s, k) => {
    if (!isQuestion(s)) return;
    out.questions++;
    const o = state.steps[k].outcome;
    if (o) { out[o]++; out.xp += XP[o]; }
  });
  return out;
}

/**
 * Server-side scoring of one step from its stored events (ordered by tryNo). The client never decides XP.
 * "main_ok" events are not judged tries. The first answer is the first event of any kind.
 */
export function scoreStep(step: QuestionStep, events: Pick<TryEvent, "kind" | "answer" | "hintsUsed" | "tryNo">[]): { outcome: Outcome | null; xp: number; tries: number; correct: boolean[] } {
  const checks = events.filter((e) => e.kind === "check");
  const correct = checks.map((e) => evaluate(step, e.answer).correct);
  const hints = Math.min(MAX_HINTS, Math.max(0, ...events.map((e) => e.hintsUsed)));
  const win = correct.indexOf(true);
  let outcome: Outcome | null = null;
  if (win >= 0) outcome = win === 0 && hints === 0 ? "independent" : "supported";
  else if (events.some((e) => e.kind === "reveal") && checks.length >= REVEAL_AFTER_TRIES) outcome = "revealed";
  return { outcome, xp: outcome ? XP[outcome] : 0, tries: checks.length, correct };
}
