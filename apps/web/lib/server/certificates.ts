import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { certificateEarned } from "@/lib/certificate";
import type { SkillRow } from "@/lib/skill-state";

export type Certificate = { pathId: string; issuedAt: string; code: string };
/** With the certificate page switch (certificates.public) and when it last changed. */
export type CertificateFull = Certificate & { public: boolean; changedAt: string };

/**
 * Issues a certificate for every joined path whose skills are all Shown or Kept, once, and returns all the learner's certificates.
 * Called when the profile or a certificate opens, so it needs nothing from the lesson player. Never throws.
 */
export async function ensureCertificates(userId: string, joined: string[], skills: Map<string, SkillRow>): Promise<CertificateFull[]> {
  try {
    const db = createAdminClient();
    const earned = joined.filter((p) => certificateEarned(p, (id) => skills.get(id)?.state));
    if (earned.length) await db.from("certificates").upsert(earned.map((path_id) => ({ user_id: userId, path_id })), { onConflict: "user_id,path_id", ignoreDuplicates: true });
    const { data } = await db.from("certificates").select("path_id, issued_at, code, public, public_changed_at").eq("user_id", userId).order("issued_at");
    return (data ?? []).map((c) => ({ pathId: c.path_id as string, issuedAt: c.issued_at as string, code: c.code as string, public: !!c.public, changedAt: c.public_changed_at as string }));
  } catch {
    return [];
  }
}

/**
 * What a public certificate page may show: the display name, the path, how many skills, the date and the code. Nothing else.
 * Null unless the learner turned the page on (certificates.public), so a private or unknown code is a 404. Read on every request.
 */
export type PublicCertificate = { code: string; pathId: string; name: string; issuedAt: string; changedAt: string };
export async function publicCertificate(code: string): Promise<PublicCertificate | null> {
  if (!/^[a-z0-9]{8,32}$/.test(code)) return null;
  try {
    const db = createAdminClient();
    const { data: c } = await db.from("certificates").select("user_id, path_id, issued_at, code, public, public_changed_at").eq("code", code).maybeSingle();
    if (!c || !c.public) return null;
    const { data: p } = await db.from("profiles").select("display_name").eq("user_id", c.user_id).maybeSingle();
    if (!p?.display_name) return null;
    return { code: c.code as string, pathId: c.path_id as string, name: p.display_name as string, issuedAt: c.issued_at as string, changedAt: c.public_changed_at as string };
  } catch {
    return null;
  }
}
