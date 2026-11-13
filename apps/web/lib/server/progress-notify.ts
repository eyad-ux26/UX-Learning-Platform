// Progress notifications sent through notify() (lib/server/notify.ts): a badge turning gold (Kept) and skills due for review.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { content, getPath } from "@uxgate/content";
import { allowed } from "@/lib/notifications";
import { siteOrigin, unsubHref } from "@/lib/email-token";
import { pathArt } from "@/lib/path-art";
import { badgeEmail } from "./email/templates";
import { sendEmail } from "./email/send";
import { loadPrefs, notify } from "./notify";

const skillMeta = (id: string) => {
  const unit = content.units.find((u) => u.skills.some((s) => s.id === id));
  const skill = unit?.skills.find((s) => s.id === id);
  return unit && skill ? { unit, skill } : null;
};

/**
 * Skills that just turned Kept: one inbox item (and push, if chosen) per badge, and one email for the session naming the
 * first one, so a review that turns five badges gold sends one email, not five. Never throws: the answers are saved already.
 */
export async function notifyKept(db: SupabaseClient, userId: string, skillIds: string[]) {
  if (!skillIds.length) return;
  try {
    const prefs = await loadPrefs(db, userId);
    const { data: p } = await db.from("profiles").select("locale").eq("user_id", userId).maybeSingle();
    const locale = p?.locale === "ar" ? "ar" : "en";
    for (const id of skillIds.slice(0, 5)) {
      const m = skillMeta(id);
      if (m) await notify(userId, "badge", { name: m.skill.title }, "/app/badges", { db, prefs, locale });
    }
    const first = skillMeta(skillIds[0]);
    if (!first || !allowed(prefs, "badge", "email")) return;
    const { data: u } = await db.auth.admin.getUserById(userId);
    if (!u.user?.email) return;
    const base = `${siteOrigin()}/${locale}`;
    const path = getPath(first.unit.pathId);
    const mail = badgeEmail({
      locale,
      skill: first.skill.title[locale],
      where: `${path?.title.en ?? first.unit.pathId} · ${first.unit.title[locale]}`,
      pathImg: pathArt(first.unit.pathId),
      badgesHref: `${base}/app/badges`,
      settingsHref: `${base}/app/settings/notifications`,
      unsubscribeHref: await unsubHref(userId, "badge", locale),
    });
    await sendEmail({ to: u.user.email, ...mail, kind: "badge", userId, locale });
  } catch (e) {
    console.warn(`WARN badge notice for ${userId}: ${(e as Error).message}`);
  }
}

/** About how long a review session takes: a little over a minute a question, a session asks at most 5. */
export const reviewMinutes = (count: number) => Math.max(2, Math.round(Math.min(count, 5) * 1.2));

/**
 * The daily "skills to review" notice. Only learners with a skill that came due in the last day are told (so a learner who
 * leaves reviews waiting is not told again every day), and only once a day. Learners are taken in id order after `after`,
 * `limit` at a time, so a repeated call moves on instead of telling the same people again.
 */
export async function notifyReviewsDue(db: SupabaseClient, now: Date, after: string | null, limit: number) {
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString();
  let q = db
    .from("skill_states")
    .select("user_id")
    .eq("state", "shown")
    .gt("next_review_at", dayAgo)
    .lte("next_review_at", now.toISOString())
    .order("user_id")
    .limit(limit * 5);
  if (after) q = q.gt("user_id", after);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const users = [...new Set((data ?? []).map((r) => r.user_id as string))].slice(0, limit);
  if (!users.length)
    return { notified: 0, failed: 0, next: null as string | null, stoppedEarly: null as string | null };
  const [{ data: due }, { data: told }] = await Promise.all([
    db
      .from("skill_states")
      .select("user_id")
      .eq("state", "shown")
      .lte("next_review_at", now.toISOString())
      .in("user_id", users),
    db
      .from("notifications")
      .select("user_id")
      .eq("kind", "review")
      .gte("created_at", new Date(now.getTime() - 20 * 3_600_000).toISOString())
      .in("user_id", users),
  ]);
  const count = new Map<string, number>();
  for (const r of due ?? []) count.set(r.user_id as string, (count.get(r.user_id as string) ?? 0) + 1);
  const skip = new Set((told ?? []).map((r) => r.user_id as string));
  let notified = 0;
  let failed = 0;
  let last: string | null = null;
  for (const id of users) {
    if (!skip.has(id)) {
      try {
        const n = count.get(id) ?? 1;
        await notify(id, "review", { count: n, minutes: reviewMinutes(n) }, "/app/review", { db });
        notified++;
      } catch (e) {
        const msg = (e as Error).message;
        failed++;
        if (/subrequest/i.test(msg)) return { notified, failed, next: last, stoppedEarly: "subrequest_budget" };
        console.warn(`WARN review notice for ${id}: ${msg}`);
      }
    }
    last = id;
  }
  return { notified, failed, next: users.length === limit ? last : null, stoppedEarly: null };
}
