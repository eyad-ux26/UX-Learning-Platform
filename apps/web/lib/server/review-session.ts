// The review queue and the next review session, read on the server. Used by the review pages and by /api/attempts,
// which rebuilds the session itself so a client cannot choose its own review questions.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { content } from "@uxgate/content";
import type { QuestionStep } from "@uxgate/content/types";
import { isQuestion } from "@uxgate/player/engine";
import { getBank } from "@/lib/server/content";
import {
  buildQueue,
  confidentErrorSkills,
  pathOfId,
  pickReviewSteps,
  sessionSkills,
  type CheckResult,
  type ReviewItem,
  type ReviewSkill,
} from "@/lib/review";
import type { SkillRow, SkillStateName } from "@/lib/skill-state";

/** Reads a learner's skill states into the shape the pure rules use. */
export async function loadSkillStates(db: SupabaseClient, userId: string): Promise<Map<string, SkillRow>> {
  const { data } = await db
    .from("skill_states")
    .select("skill_id, state, shown_at, kept_at, next_review_at")
    .eq("user_id", userId);
  const d = (v: unknown) => (v ? new Date(v as string) : null);
  return new Map(
    (data ?? []).map((r) => [
      r.skill_id as string,
      {
        state: r.state as SkillStateName,
        shownAt: d(r.shown_at),
        keptAt: d(r.kept_at),
        nextReviewAt: d(r.next_review_at),
      },
    ]),
  );
}

/** Every due skill, confident errors first ("Sure" and wrong, with no right answer since). */
export async function loadQueue(
  db: SupabaseClient,
  userId: string,
  states: Map<string, SkillRow>,
  now = new Date(),
): Promise<{ skills: ReviewSkill[]; queue: ReviewItem[] }> {
  const skills: ReviewSkill[] = [...states].map(([skillId, r]) => ({ skillId, pathId: pathOfId(skillId), ...r }));
  let results: CheckResult[] = [];
  const due = skills.filter((s) => s.state === "shown").map((s) => s.skillId);
  if (due.length) {
    const { data } = await db
      .from("step_results")
      .select("skill_id, correct, confidence, created_at")
      .eq("user_id", userId)
      .eq("kind", "check")
      .in("skill_id", due)
      .order("created_at", { ascending: false })
      .limit(500);
    results = (data ?? []).map((r) => ({
      skillId: r.skill_id as string,
      correct: !!r.correct,
      confidence: r.confidence as number | null,
      at: Date.parse(r.created_at as string),
    }));
  }
  return { skills, queue: buildQueue(skills, confidentErrorSkills(results), now) };
}

/** The unit a skill belongs to, only when that unit has a re-test bank to draw review cases from. */
const unitWithBank = new Map(
  content.units.flatMap((u) =>
    content.banks.some((b) => b.unitId === u.id) ? u.skills.map((s) => [s.id, u.id] as const) : [],
  ),
);
export const reviewUnitOf = (skillId: string) => unitWithBank.get(skillId);

/** `due` holds every skill that is due now and can be reviewed, in any unit; `remaining` is how many of them this session does not ask. */
export type ReviewSession = {
  unitId: string;
  bankId: string;
  hash: string;
  skills: string[];
  steps: QuestionStep[];
  due: Set<string>;
  remaining: number;
  seen: ReadonlyMap<string, number>;
};

/**
 * The next review session: the due skills of one unit (at most 5), one bank case each, preferring a case the learner
 * has not answered in a mastery round or an earlier review. Null when nothing is due.
 */
export async function loadReviewSession(
  db: SupabaseClient,
  userId: string,
  now = new Date(),
  states?: Map<string, SkillRow>,
): Promise<ReviewSession | null> {
  const { queue } = await loadQueue(db, userId, states ?? (await loadSkillStates(db, userId)), now);
  const pick = sessionSkills(queue, reviewUnitOf);
  if (!pick) return null;
  const bank = await getBank(pick.unitId);
  if (!bank) return null;
  const { data } = await db
    .from("step_results")
    .select("step_id, created_at, attempts!inner(lesson_id)")
    .eq("user_id", userId)
    .eq("attempts.lesson_id", bank.lessonId);
  const seen = new Map<string, number>();
  for (const r of data ?? [])
    seen.set(r.step_id as string, Math.max(seen.get(r.step_id as string) ?? 0, Date.parse(r.created_at as string)));
  const steps = pickReviewSteps(bank.body.steps.filter(isQuestion) as QuestionStep[], pick.skills, seen);
  if (!steps.length) return null;
  const due = new Set(queue.map((q) => q.skillId).filter((id) => reviewUnitOf(id)));
  return {
    unitId: pick.unitId,
    bankId: bank.lessonId,
    hash: bank.hash,
    skills: steps.map((s) => s.skill),
    steps,
    due,
    remaining: due.size - steps.length,
    seen,
  };
}
