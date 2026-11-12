import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { applyReview, type SkillRow } from "@/lib/skill-state";
import { learningRules } from "@/lib/app-config";
import { DEFAULT_RULES } from "@/lib/learning-rules";

type Db = ReturnType<typeof createAdminClient>;
/** Default; the current value comes from Learning rules. */
export const REVIEW_AFTER_DAYS = DEFAULT_RULES.reviewAfterDays;

/** Practiced: the learner finished a lesson that tests the skill. Never changes a skill that is already further on. */
export async function markPracticed(db: Db, userId: string, skillIds: string[]) {
  const ids = [...new Set(skillIds)];
  if (!ids.length) return;
  await db.from("skill_states").upsert(ids.map((skill_id) => ({ user_id: userId, skill_id, state: "practiced" })), { onConflict: "user_id,skill_id", ignoreDuplicates: true });
}

/**
 * Shown: the skill was right on the first try with no help (in a skill check or the mastery round).
 * Sets shown_at and the first review date once; a skill that is already Shown keeps its dates and one that is Kept stays Kept.
 */
export async function markShown(db: Db, userId: string, skillIds: string[], now = new Date()) {
  const ids = [...new Set(skillIds)];
  if (!ids.length) return;
  const [{ data: current }, rules] = await Promise.all([db.from("skill_states").select("skill_id, state").eq("user_id", userId).in("skill_id", ids), learningRules()]);
  const done = new Set((current ?? []).filter((r) => r.state === "kept" || r.state === "shown").map((r) => r.skill_id as string));
  const next = new Date(now.getTime() + rules.reviewAfterDays * 86_400_000).toISOString();
  const rows = ids.filter((id) => !done.has(id)).map((skill_id) => ({ user_id: userId, skill_id, state: "shown", shown_at: now.toISOString(), next_review_at: next }));
  if (rows.length) await db.from("skill_states").upsert(rows, { onConflict: "user_id,skill_id" });
}

/**
 * A review session ended. Each skill asked is judged on its first try: right when due makes it Kept (gold); a miss
 * keeps it Shown and brings it back tomorrow. The update only applies to a row that is still Shown, so a double
 * finish or a stale read can never move a skill backwards.
 */
export async function markReviewed(db: Db, userId: string, asked: string[], correct: string[], now = new Date()) {
  const ids = [...new Set(asked)];
  if (!ids.length) return [];
  const { data } = await db.from("skill_states").select("skill_id, state, shown_at, kept_at, next_review_at").eq("user_id", userId).in("skill_id", ids);
  const ok = new Set(correct);
  const rules = await learningRules();
  const kept: string[] = [];
  for (const r of data ?? []) {
    const prev: SkillRow = { state: r.state as SkillRow["state"], shownAt: r.shown_at ? new Date(r.shown_at as string) : null, keptAt: r.kept_at ? new Date(r.kept_at as string) : null, nextReviewAt: r.next_review_at ? new Date(r.next_review_at as string) : null };
    const next = applyReview(prev, ok.has(r.skill_id as string), now, rules);
    if (next === prev) continue;
    await db.from("skill_states")
      .update({ state: next.state, kept_at: next.keptAt?.toISOString() ?? null, next_review_at: next.nextReviewAt?.toISOString() ?? null })
      .eq("user_id", userId).eq("skill_id", r.skill_id as string).eq("state", "shown");
    if (next.state === "kept") kept.push(r.skill_id as string);
  }
  return kept;
}
