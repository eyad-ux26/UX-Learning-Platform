import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Start times of the learner's finished paid replays of a lesson (row-level security: their own attempts only). */
export async function paidReplayStarts(db: SupabaseClient | null, lessonId: string): Promise<string[]> {
  if (!db) return [];
  const { data } = await db.from("attempts").select("started_at").eq("lesson_id", lessonId).eq("replay_kind", "paid").not("finished_at", "is", null);
  return (data ?? []).map((p) => p.started_at as string);
}
