import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;
export const REVIEW_AFTER_DAYS = 3;

/** Practiced: the learner finished a lesson that tests the skill. Never changes a skill that is already further on. */
export async function markPracticed(db: Db, userId: string, skillIds: string[]) {
  const ids = [...new Set(skillIds)];
  if (!ids.length) return;
  await db.from("skill_states").upsert(ids.map((skill_id) => ({ user_id: userId, skill_id, state: "practiced" })), { onConflict: "user_id,skill_id", ignoreDuplicates: true });
}

/**
 * Shown: the skill was right on the first try with no help (in a skill check or the mastery round).
 * Sets shown_at and the first review date; a skill that is already Kept stays Kept.
 */
export async function markShown(db: Db, userId: string, skillIds: string[], now = new Date()) {
  const ids = [...new Set(skillIds)];
  if (!ids.length) return;
  const { data: current } = await db.from("skill_states").select("skill_id, state").eq("user_id", userId).in("skill_id", ids);
  const kept = new Set((current ?? []).filter((r) => r.state === "kept").map((r) => r.skill_id as string));
  const next = new Date(now.getTime() + REVIEW_AFTER_DAYS * 86_400_000).toISOString();
  const rows = ids.filter((id) => !kept.has(id)).map((skill_id) => ({ user_id: userId, skill_id, state: "shown", shown_at: now.toISOString(), next_review_at: next }));
  if (rows.length) await db.from("skill_states").upsert(rows, { onConflict: "user_id,skill_id" });
}
