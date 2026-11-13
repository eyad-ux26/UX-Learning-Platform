"use server";

import { z } from "zod";
import { content } from "@uxgate/content";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/coming-soon";
import { attemptKind, teamPlan } from "@/lib/team-tools";

/** Testing tools for the team: an admin account or a member whose roles hold testing.tools (lib/coming-soon.ts isAdmin), checked on every call. */
async function admin(): Promise<{ id: string } | null> {
  const { data } = await (await createClient()).auth.getUser();
  const u = data.user;
  return u && isAdmin(u) ? { id: u.id } : null;
}

const pathInput = z.object({
  pathId: z.string().regex(/^P\d{2}$/),
  throughUnit: z.number().int().min(1).max(40).nullable(),
});
export type TeamResult = { ok: true; lessons: number; skipped: number } | { ok: false };

/** Marks the path's lessons (units 1..throughUnit, or all) as finished and their skills as Shown, so the next units unlock and a finished path earns its certificate. */
export async function markDone(input: z.infer<typeof pathInput>): Promise<TeamResult> {
  const p = pathInput.safeParse(input);
  const me = p.success ? await admin() : null;
  if (!p.success || !me) return { ok: false };
  const plan = teamPlan(p.data.pathId, p.data.throughUnit);
  if (!plan.lessonIds.length) return { ok: false };
  const db = createAdminClient();
  const now = new Date().toISOString();
  const [versions, done] = await Promise.all([
    db
      .from("content_versions")
      .select("id, lesson_id, published_at")
      .in("lesson_id", plan.lessonIds)
      .order("published_at", { ascending: false }),
    db
      .from("attempts")
      .select("lesson_id")
      .eq("user_id", me.id)
      .in("lesson_id", plan.lessonIds)
      .not("finished_at", "is", null),
  ]);
  if (versions.error || done.error) return { ok: false };
  const version = new Map<string, string>();
  for (const v of versions.data ?? [])
    if (!version.has(v.lesson_id as string)) version.set(v.lesson_id as string, v.id as string);
  const finished = new Set((done.data ?? []).map((a) => a.lesson_id as string));
  const modeOf = new Map(content.lessons.map((l) => [l.lessonId, l.mode]));
  const todo = plan.lessonIds.filter((id) => !finished.has(id) && version.has(id));
  const skipped = plan.lessonIds.filter((id) => !finished.has(id) && !version.has(id)).length;
  await db
    .from("enrollments")
    .upsert({ user_id: me.id, path_id: p.data.pathId }, { onConflict: "user_id,path_id", ignoreDuplicates: true });
  if (todo.length) {
    const r = await db.from("attempts").insert(
      todo.map((lesson_id) => ({
        user_id: me.id,
        lesson_id,
        content_version_id: version.get(lesson_id)!,
        client_attempt_id: `team-${lesson_id}-${Date.now()}`,
        started_at: now,
        finished_at: now,
        kind: attemptKind(modeOf.get(lesson_id) ?? "lesson"),
      })),
    );
    if (r.error) return { ok: false };
  }
  const s = await db.from("skill_states").upsert(
    plan.skillIds.map((skill_id) => ({
      user_id: me.id,
      skill_id,
      state: "shown",
      shown_at: now,
      next_review_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    })),
    { onConflict: "user_id,skill_id" },
  );
  return s.error ? { ok: false } : { ok: true, lessons: todo.length, skipped };
}

/** Clears the path for this account: its attempts (and their results and XP), skill states and certificate. */
export async function resetPath(input: { pathId: string }): Promise<TeamResult> {
  const p = pathInput.pick({ pathId: true }).safeParse(input);
  const me = p.success ? await admin() : null;
  if (!p.success || !me) return { ok: false };
  const plan = teamPlan(p.data.pathId);
  const db = createAdminClient();
  const [a, s, c] = await Promise.all([
    db.from("attempts").delete().eq("user_id", me.id).in("lesson_id", plan.lessonIds),
    db.from("skill_states").delete().eq("user_id", me.id).in("skill_id", plan.skillIds),
    db.from("certificates").delete().eq("user_id", me.id).eq("path_id", p.data.pathId),
  ]);
  return a.error || s.error || c.error ? { ok: false } : { ok: true, lessons: plan.lessonIds.length, skipped: 0 };
}
