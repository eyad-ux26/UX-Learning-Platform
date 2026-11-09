import "server-only";
import { content, getLessonMeta } from "@uxgate/content";
import { createAdminClient } from "@/lib/supabase/admin";

// Content quality (QLT-1 to QLT-3) and the skills screen (CNT-4). Candidates come live from the numbers and from learner
// reports; a row in content_flags (0063) keeps what the team decided about a step.

/** A step is worth a look when at least this many first tries are in and fewer than this share were right. */
export const MIN_TRIES = 20;
export const LOW_RIGHT = 0.5;
export const HIGH_REVEAL = 0.25;

export type StepStat = { lesson_id: string; step_id: string; skill_id: string | null; first_tries: number; first_right: number; with_hints: number; reveals: number; avg_confidence: number | null; misconceptions: Record<string, number> };
export type FlagRow = { lesson_id: string; step_id: string; source: string; status: string; note: string | null; misconception_id: string | null; updated_at: string; updated_by: string | null; check_after: string | null };
export type Candidate = {
  lessonId: string; stepId: string; lessonTitle: string; why: ("numbers" | "reveals" | "learners")[];
  stat: StepStat | null; reports: number; openReports: number; reasons: Record<string, number>; flag: FlagRow | null;
};

const n = (v: unknown) => Number(v ?? 0);
const statOf = (r: Record<string, unknown>): StepStat => ({
  lesson_id: r.lesson_id as string, step_id: r.step_id as string, skill_id: (r.skill_id as string) ?? null, first_tries: n(r.first_tries), first_right: n(r.first_right),
  with_hints: n(r.with_hints), reveals: n(r.reveals), avg_confidence: r.avg_confidence == null ? null : Number(r.avg_confidence), misconceptions: (r.misconceptions as Record<string, number>) ?? {},
});

export async function qualityList(days = 90): Promise<{ rows: Candidate[]; ready: boolean }> {
  const db = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [stats, reports, flags] = await Promise.all([
    db.rpc("admin_step_stats", { p_since: since }),
    db.rpc("admin_step_reports", { p_since: since }),
    db.from("content_flags").select("lesson_id, step_id, source, status, note, misconception_id, updated_at, updated_by, check_after"),
  ]);
  const ready = !flags.error;
  const key = (l: string, s: string) => `${l} ${s}`;
  const byStat = new Map(((stats.data ?? []) as Record<string, unknown>[]).map((r) => { const s = statOf(r); return [key(s.lesson_id, s.step_id), s]; }));
  const byRep = new Map(((reports.data ?? []) as { lesson_id: string; step_id: string; reports: number; open_reports: number; reasons: Record<string, number> }[]).map((r) => [key(r.lesson_id, r.step_id), r]));
  const byFlag = new Map(((flags.data ?? []) as FlagRow[]).map((f) => [key(f.lesson_id, f.step_id), f]));
  const keys = new Set<string>();
  for (const [k, s] of byStat) {
    const tries = s.first_tries + s.reveals;
    if (s.first_tries >= MIN_TRIES && s.first_right / s.first_tries < LOW_RIGHT) keys.add(k);
    if (tries >= MIN_TRIES && s.reveals / tries > HIGH_REVEAL) keys.add(k);
  }
  for (const [k, r] of byRep) if (n(r.open_reports) > 0) keys.add(k);
  for (const k of byFlag.keys()) keys.add(k);
  const rows = [...keys].map((k) => {
    const [lessonId, stepId] = k.split(" ");
    const s = byStat.get(k) ?? null;
    const r = byRep.get(k);
    const why: Candidate["why"] = [];
    if (s && s.first_tries >= MIN_TRIES && s.first_right / s.first_tries < LOW_RIGHT) why.push("numbers");
    if (s && s.first_tries + s.reveals >= MIN_TRIES && s.reveals / (s.first_tries + s.reveals) > HIGH_REVEAL) why.push("reveals");
    if (r && n(r.open_reports) > 0) why.push("learners");
    return { lessonId, stepId, lessonTitle: getLessonMeta(lessonId)?.body.title.en ?? lessonId, why, stat: s, reports: n(r?.reports), openReports: n(r?.open_reports), reasons: r?.reasons ?? {}, flag: byFlag.get(k) ?? null };
  });
  const rank = (c: Candidate) => (c.flag && ["fixed", "wont_fix"].includes(c.flag.status) ? 2 : c.flag ? 1 : 0);
  rows.sort((a, b) => rank(a) - rank(b) || b.openReports - a.openReports || (a.stat ? a.stat.first_right / Math.max(1, a.stat.first_tries) : 1) - (b.stat ? b.stat.first_right / Math.max(1, b.stat.first_tries) : 1));
  return { rows, ready };
}

/** One lesson's steps with their numbers (QLT-3, the lesson report). */
export async function lessonReport(lessonId: string, days = 90): Promise<StepStat[]> {
  const { data } = await createAdminClient().rpc("admin_step_stats", { p_lesson: lessonId, p_since: new Date(Date.now() - days * 86_400_000).toISOString() });
  return ((data ?? []) as Record<string, unknown>[]).map(statOf);
}

export type SkillRow = { id: string; unitId: string; unitTitle: string; title: { en: string; ar: string }; firstTries: number; firstRight: number; shown: number; kept: number };

export async function skillsFor(pathId: string): Promise<{ rows: SkillRow[]; misconceptions: { id: string; hits: number }[]; ready: boolean }> {
  const db = createAdminClient();
  const [st, mc] = await Promise.all([db.rpc("admin_skill_stats", { p_path: pathId }), db.rpc("admin_misconception_counts", { p_path: pathId })]);
  const by = new Map(((st.data ?? []) as { skill_id: string; first_tries: number; first_right: number; shown: number; kept: number }[]).map((r) => [r.skill_id, r]));
  const rows = content.units.filter((u) => u.pathId === pathId).flatMap((u) => u.skills.map((s) => {
    const r = by.get(s.id);
    return { id: s.id, unitId: u.id, unitTitle: u.title.en, title: s.title, firstTries: n(r?.first_tries), firstRight: n(r?.first_right), shown: n(r?.shown), kept: n(r?.kept) };
  }));
  const misconceptions = ((mc.data ?? []) as { misconception_id: string; hits: number }[]).map((m) => ({ id: m.misconception_id, hits: n(m.hits) })).sort((a, b) => b.hits - a.hits);
  return { rows, misconceptions, ready: !st.error };
}
