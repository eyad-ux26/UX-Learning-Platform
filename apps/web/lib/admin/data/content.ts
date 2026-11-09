import "server-only";
import { content, getLessonMeta, type Lesson, type LessonVersion } from "@uxgate/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLessonVersion as compiledOrLive } from "@/lib/server/content";
import { CATALOG } from "@/lib/catalog-list";

// Reads for the Content screens (CNT-1 to CNT-6). The tree comes from the compiled index (titles, order, units); the
// database says which version is live, which lessons have a draft and what is in review. Before 0060 runs, the
// database parts are empty and the screens say so.

export type LessonRow = {
  id: string; title: { en: string; ar: string }; mode: string; order: number; minutes: number;
  liveNo: number | null; liveHow: string | null; liveSince: string | null; liveHash: string | null; compiledHash: string;
  draft: null | { status: "draft" | "in_review"; updatedAt: string; editors: string[]; releaseId: string | null };
};
export type UnitRow = { id: string; title: { en: string; ar: string }; free: boolean; skills: number; lessons: LessonRow[] };
export type PathRow = { id: string; name: string; title: { en: string; ar: string } | null; built: boolean; units: UnitRow[] };

type LiveRow = { lesson_id: string; version_id: string; since: string; how: string; content_versions: { hash: string } | null; content_version_info?: unknown };

/** True once 0060 is in the database. */
export async function contentDbReady(): Promise<boolean> {
  const { error } = await createAdminClient().from("lesson_live").select("lesson_id").limit(1);
  return !error;
}

async function liveAndDrafts() {
  const db = createAdminClient();
  const [live, info, drafts] = await Promise.all([
    db.from("lesson_live").select("lesson_id, version_id, since, how, content_versions(hash)"),
    db.from("content_version_info").select("version_id, version_no"),
    db.from("lesson_drafts").select("lesson_id, status, updated_at, editors, release_id"),
  ]);
  const no = new Map((info.data ?? []).map((r) => [r.version_id as string, r.version_no as number]));
  const liveBy = new Map(((live.data ?? []) as unknown as LiveRow[]).map((r) => [r.lesson_id, { no: no.get(r.version_id) ?? null, how: r.how, since: r.since, hash: r.content_versions?.hash ?? null }]));
  const draftBy = new Map((drafts.data ?? []).map((d) => [d.lesson_id as string, { status: d.status as "draft" | "in_review", updatedAt: d.updated_at as string, editors: d.editors as string[], releaseId: d.release_id as string | null }]));
  return { liveBy, draftBy, ready: !live.error };
}

/** Every path of the catalogue with its units and lessons (and banks, as "Re-test bank"). */
export async function contentTree(): Promise<{ paths: PathRow[]; ready: boolean }> {
  const { liveBy, draftBy, ready } = await liveAndDrafts();
  const row = (l: (typeof content.lessons)[number]): LessonRow => {
    const lv = liveBy.get(l.lessonId);
    return {
      id: l.lessonId, title: l.body.title, mode: l.mode, order: l.order, minutes: l.minutes, compiledHash: l.hash,
      liveNo: lv?.no ?? null, liveHow: lv?.how ?? null, liveSince: lv?.since ?? null, liveHash: lv?.hash ?? null, draft: draftBy.get(l.lessonId) ?? null,
    };
  };
  const paths = CATALOG.map((c) => {
    const p = content.paths.find((x) => x.id === c.id);
    const units = content.units.filter((u) => u.pathId === c.id).map((u) => ({
      id: u.id, title: u.title, free: u.free, skills: u.skills.length,
      lessons: [...content.lessons.filter((l) => l.unitId === u.id), ...content.banks.filter((b) => b.unitId === u.id)].sort((a, b) => a.order - b.order).map(row),
    }));
    return { id: c.id, name: c.name, title: p?.title ?? null, built: units.length > 0, units };
  });
  return { paths, ready };
}

export type EditorData = {
  meta: NonNullable<ReturnType<typeof getLessonMeta>>;
  ready: boolean;
  /** The live version (or the compiled one before 0060). */
  base: { versionId: string | null; no: number | null; hash: string; body: Lesson };
  draft: null | { body: Lesson; acks: string[]; status: "draft" | "in_review"; editors: string[]; updatedAt: string; releaseId: string | null; baseVersionId: string };
  history: { versionId: string; no: number; origin: string; createdAt: string; author: string | null; live: boolean }[];
};

/** A lesson for the editor: the version it starts from, the draft if there is one, and its numbered history. */
export async function lessonForEditor(lessonId: string): Promise<EditorData | null> {
  const meta = getLessonMeta(lessonId);
  if (!meta) return null;
  const db = createAdminClient();
  const [live, draft, info] = await Promise.all([
    db.from("lesson_live").select("version_id, content_versions(hash, body)").eq("lesson_id", lessonId).maybeSingle(),
    db.from("lesson_drafts").select("body, acks, status, editors, updated_at, release_id, base_version_id").eq("lesson_id", lessonId).maybeSingle(),
    db.from("content_version_info").select("version_id, version_no, origin, created_at, author_id").eq("lesson_id", lessonId).order("version_no", { ascending: false }),
  ]);
  const ready = !live.error;
  const lv = live.data as unknown as { version_id: string; content_versions: { hash: string; body: Lesson } | null } | null;
  let base: EditorData["base"];
  if (lv?.content_versions) {
    base = { versionId: lv.version_id, no: (info.data ?? []).find((r) => r.version_id === lv.version_id)?.version_no ?? null, hash: lv.content_versions.hash, body: lv.content_versions.body };
  } else {
    const c = (await compiledOrLive(lessonId)) as LessonVersion | undefined;
    if (!c) return null;
    // Before the v1 import the compiled version is the one to edit; its database row (from the seed) is found by hash.
    const { data: v } = await db.from("content_versions").select("id").eq("lesson_id", lessonId).eq("hash", c.hash).maybeSingle();
    base = { versionId: (v?.id as string) ?? null, no: null, hash: c.hash, body: c.body };
  }
  // A draft is edited against the version it started from, which is the live one unless the lesson changed since.
  if (draft.data && draft.data.base_version_id !== base.versionId) {
    const { data: v } = await db.from("content_versions").select("id, hash, body").eq("id", draft.data.base_version_id).maybeSingle();
    if (v) base = { versionId: v.id as string, no: (info.data ?? []).find((r) => r.version_id === v.id)?.version_no ?? null, hash: v.hash as string, body: v.body as Lesson };
  }
  const authors = await names((info.data ?? []).map((r) => r.author_id as string | null).filter(Boolean) as string[]);
  const d = draft.data;
  return {
    meta, ready, base,
    draft: d ? { body: d.body as Lesson, acks: (d.acks as string[]) ?? [], status: d.status as "draft" | "in_review", editors: d.editors as string[], updatedAt: d.updated_at as string, releaseId: d.release_id as string | null, baseVersionId: d.base_version_id as string } : null,
    history: (info.data ?? []).map((r) => ({ versionId: r.version_id as string, no: r.version_no as number, origin: r.origin as string, createdAt: r.created_at as string, author: r.author_id ? authors.get(r.author_id as string) ?? null : null, live: r.version_id === lv?.version_id })),
  };
}

/** Team member names by id. */
export async function names(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await createAdminClient().from("admin_members").select("user_id, email, display_name").in("user_id", [...new Set(ids)]);
  return new Map((data ?? []).map((m) => [m.user_id as string, (m.display_name as string) || (m.email as string)]));
}

export type ReleaseRow = {
  id: string; title: string; note: string | null; status: string; requestedBy: string; authors: string[]; createdAt: string; checks: { ok?: boolean; checks?: { id: string; label: string; ok: boolean; detail?: string }[] };
  decidedBy: string | null; decidedAt: string | null; decisionNote: string | null; rolledBackBy: string | null; rolledBackAt: string | null; rollbackReason: string | null;
  lessons: string[];
};

export async function listReleases(status?: string): Promise<{ rows: ReleaseRow[]; names: Map<string, string>; ready: boolean }> {
  const db = createAdminClient();
  let q = db.from("content_releases").select("*, content_release_items(lesson_id)").order("created_at", { ascending: false }).limit(100);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  const rows = (data ?? []).map(releaseRow);
  return { rows, names: await names(rows.flatMap((r) => [r.requestedBy, r.decidedBy, r.rolledBackBy].filter(Boolean) as string[])), ready: !error };
}

function releaseRow(r: Record<string, unknown>): ReleaseRow {
  return {
    id: r.id as string, title: r.title as string, note: r.note as string | null, status: r.status as string, requestedBy: r.requested_by as string, authors: (r.authors as string[]) ?? [],
    createdAt: r.created_at as string, checks: (r.checks as ReleaseRow["checks"]) ?? {}, decidedBy: r.decided_by as string | null, decidedAt: r.decided_at as string | null,
    decisionNote: r.decision_note as string | null, rolledBackBy: r.rolled_back_by as string | null, rolledBackAt: r.rolled_back_at as string | null, rollbackReason: r.rollback_reason as string | null,
    lessons: ((r.content_release_items as { lesson_id: string }[] | null) ?? []).map((i) => i.lesson_id),
  };
}

export async function releaseDetail(id: string) {
  const db = createAdminClient();
  const { data: r } = await db.from("content_releases").select("*, content_release_items(lesson_id)").eq("id", id).maybeSingle();
  if (!r) return null;
  const rel = releaseRow(r);
  const { data: items } = await db.from("content_release_items").select("lesson_id, body, hash, from_version_id, to_version_id").eq("release_id", id);
  const fromIds = (items ?? []).map((i) => i.from_version_id as string).filter(Boolean);
  const { data: froms } = fromIds.length ? await db.from("content_versions").select("id, body").in("id", fromIds) : { data: [] as { id: string; body: unknown }[] };
  const fromBody = new Map((froms ?? []).map((f) => [f.id as string, f.body as Lesson]));
  const { data: liveRows } = await db.from("lesson_live").select("lesson_id, version_id").in("lesson_id", rel.lessons);
  const liveBy = new Map((liveRows ?? []).map((l) => [l.lesson_id as string, l.version_id as string]));
  return {
    release: rel,
    items: (items ?? []).map((i) => ({
      lessonId: i.lesson_id as string, body: i.body as Lesson, from: i.from_version_id ? fromBody.get(i.from_version_id as string) ?? null : null,
      toVersionId: i.to_version_id as string | null, fromVersionId: i.from_version_id as string | null, liveVersionId: liveBy.get(i.lesson_id as string) ?? null,
    })),
    names: await names([rel.requestedBy, ...rel.authors, rel.decidedBy, rel.rolledBackBy].filter(Boolean) as string[]),
  };
}

/** How many learners have played a lesson in the last 30 days (who a publish reaches). */
export async function recentPlayers(lessonIds: string[]): Promise<number> {
  if (!lessonIds.length) return 0;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await createAdminClient().from("attempts").select("user_id").in("lesson_id", lessonIds).gte("started_at", since).limit(5000);
  return new Set((data ?? []).map((a) => a.user_id as string)).size;
}
