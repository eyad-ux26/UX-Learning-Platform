import "server-only";
import type { Learner } from "@/lib/server/learner-state";
import { ensureCertificates, type Certificate } from "@/lib/server/certificates";
import { certificateEarned } from "@/lib/certificate";

export type ProfileData = { email: string; reminder: string; since: string | null; boardOpen: boolean; certificates: Certificate[] };

/** Joined paths whose skills are all Shown or Kept but that have no certificate yet. */
export const unissuedCertificates = (me: Pick<Learner, "joined" | "skillStates">, have: Certificate[]) =>
  me.joined.map((j) => j.pathId).filter((p) => certificateEarned(p, (id) => me.skillStates.get(id)?.state) && !have.some((c) => c.pathId === p));

/**
 * What the Profile page shows beyond the shell. Usually it is already in `me` (read with the learner in one call, and the
 * email from the session token), so the page makes no database call unless a new certificate has to be issued.
 * Before migration 0039 it reads the rest itself, in one round.
 */
export async function loadProfileData(me: Learner): Promise<ProfileData> {
  const first = me.joined.map((j) => j.startedAt).sort()[0] ?? null;
  if (!me.db) return { email: "nour@example.com", reminder: "", since: first, boardOpen: false, certificates: [] };
  const x = me.profileExtra;
  const joined = me.joined.map((j) => j.pathId);
  // Certificates are read while the profile reads below run, not after them.
  const certs = x && !unissuedCertificates(me, x.certificates).length ? Promise.resolve(x.certificates) : ensureCertificates(me.userId, joined, me.skillStates);
  const [auth, extra] = await Promise.all([
    me.email ? null : me.db.auth.getUser(),
    x ? null : Promise.all([
      me.db.from("profiles").select("reminder_time, created_at").eq("user_id", me.userId).maybeSingle(),
      me.db.from("app_flags").select("enabled").eq("key", "leaderboard").maybeSingle(),
    ]),
  ]);
  const reminderTime = x ? x.reminderTime : ((extra?.[0].data?.reminder_time as string | null | undefined) ?? null);
  const createdAt = x ? x.createdAt : ((extra?.[0].data?.created_at as string | undefined) ?? null);
  return {
    email: me.email ?? auth?.data.user?.email ?? "",
    reminder: reminderTime?.slice(0, 5) ?? "",
    since: createdAt ?? first,
    boardOpen: x ? x.leaderboardOpen : !!extra?.[1].data?.enabled,
    certificates: await certs,
  };
}
