// Server-side handling of answers. The browser sends what the learner did; the server decides what it scored.
import { z } from "zod";
import type { Lesson, QuestionStep } from "@uxgate/content/types";
import { evaluate, isQuestion, scoreStep, type Outcome } from "@uxgate/player/engine";

export const eventSchema = z.object({
  stepId: z.string().min(1).max(40),
  tryNo: z.number().int().min(0).max(50),
  kind: z.enum(["check", "main_ok", "reveal"]),
  answer: z.object({ sel: z.array(z.string().max(60)).max(10), reason: z.array(z.string().max(60)).max(10).optional() }),
  hintsUsed: z.number().int().min(0).max(2),
  confidence: z.number().int().min(0).max(2).nullable(),
  clientTs: z.number().int(),
});

export const bodySchema = z.object({
  attemptId: z.string().min(1).max(120),
  lessonId: z.string().min(1).max(60),
  hash: z.string().length(64),
  startedAt: z.number().int(),
  events: z.array(eventSchema).min(1).max(200),
});
export type AttemptBody = z.infer<typeof bodySchema>;

export type StepResultRow = {
  step_id: string; skill_id: string; try_no: number; kind: string; answer: unknown; correct: boolean;
  hints_used: number; confidence: number | null; misconception_id: string | null; client_ts: string; idempotency_key: string;
};
export type XpRow = { step_id: string; outcome: Outcome; amount: number };
export type Processed = { results: StepResultRow[]; xp: XpRow[]; finished: boolean; rejected: string[] };

/**
 * Re-scores every event against the stored lesson. `correct` and XP never come from the client.
 * `prior` holds events already stored for this attempt, so a step answered across several requests still scores right.
 */
export function processEvents(lesson: Lesson, body: AttemptBody, prior: Pick<AttemptBody["events"][number], "stepId" | "tryNo" | "kind" | "answer" | "hintsUsed">[] = []): Processed {
  const steps = new Map(lesson.steps.filter(isQuestion).map((s) => [s.id, s as QuestionStep]));
  const rejected: string[] = [];
  const results: StepResultRow[] = [];
  const byStep = new Map<string, typeof prior>();
  for (const e of prior) byStep.set(e.stepId, [...(byStep.get(e.stepId) ?? []), e]);

  const seen = new Set(prior.map((e) => `${e.stepId}:${e.tryNo}:${e.kind}`));
  for (const e of [...body.events].sort((a, b) => a.clientTs - b.clientTs)) {
    const step = steps.get(e.stepId);
    if (!step) { rejected.push(`${e.stepId}: not a question in ${lesson.id}`); continue; }
    const k = `${e.stepId}:${e.tryNo}:${e.kind}`;
    const key = `${body.attemptId}:${k}`;
    byStep.set(e.stepId, [...(byStep.get(e.stepId) ?? []), e]);
    if (seen.has(k)) continue; // duplicate send: stored once
    seen.add(k);
    const single = scoreStep(step, [{ kind: e.kind, answer: e.answer, hintsUsed: e.hintsUsed, tryNo: e.tryNo }]);
    results.push({
      step_id: e.stepId, skill_id: step.skill, try_no: e.tryNo, kind: e.kind, answer: e.answer,
      correct: e.kind === "check" ? single.correct[0] === true : false,
      hints_used: e.hintsUsed, confidence: e.confidence,
      misconception_id: e.kind === "check" ? evaluate(step, e.answer).misconception?.id ?? null : null, client_ts: new Date(e.clientTs).toISOString(), idempotency_key: key,
    });
  }

  const xp: XpRow[] = [];
  for (const [stepId, events] of byStep) {
    const scored = scoreStep(steps.get(stepId)!, [...events].sort((a, b) => a.tryNo - b.tryNo));
    if (scored.outcome) xp.push({ step_id: stepId, outcome: scored.outcome, amount: scored.xp });
  }
  const finished = [...steps.keys()].every((id) => xp.some((x) => x.step_id === id));
  return { results, xp, finished, rejected };
}
