import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { certificateEarned } from "@/lib/certificate";
import type { SkillRow } from "@/lib/skill-state";

export type Certificate = { pathId: string; issuedAt: string; code: string };

/**
 * Issues a certificate for every joined path whose skills are all Shown or Kept, once, and returns all the learner's certificates.
 * Called when the profile or a certificate opens, so it needs nothing from the lesson player. Never throws.
 */
export async function ensureCertificates(userId: string, joined: string[], skills: Map<string, SkillRow>): Promise<Certificate[]> {
  try {
    const db = createAdminClient();
    const earned = joined.filter((p) => certificateEarned(p, (id) => skills.get(id)?.state));
    if (earned.length) await db.from("certificates").upsert(earned.map((path_id) => ({ user_id: userId, path_id })), { onConflict: "user_id,path_id", ignoreDuplicates: true });
    const { data } = await db.from("certificates").select("path_id, issued_at, code").eq("user_id", userId).order("issued_at");
    return (data ?? []).map((c) => ({ pathId: c.path_id as string, issuedAt: c.issued_at as string, code: c.code as string }));
  } catch {
    return [];
  }
}
