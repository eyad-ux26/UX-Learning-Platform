"use server";

import { z } from "zod";
import { getLessonMeta, type Lesson } from "@uxgate/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, check, requireFresh, run, who, type ActionResult } from "@/lib/admin/guard";
import { reasonFrom, textFrom, uuidFrom } from "@/lib/admin/form";
import { applyEdits, lessonChecks, type Edits } from "@/lib/admin/content-edit";
import { lessonForEditor } from "@/lib/admin/data/content";

type R = ActionResult;
const LESSON_ID = /^P\d{2}-U\d{2}-[LB]\d{2}$/;

function lessonIdFrom(f: FormData, name = "lesson"): string {
  const id = String(f.get(name) ?? "");
  if (!LESSON_ID.test(id)) throw new AdminError("invalid", "Something is missing. Reload the page and try again.");
  return id;
}

const editsSchema = z.record(z.string().max(200), z.object({ en: z.string().max(4000), ar: z.string().max(4000) }));

/** The body a draft starts from: the version the draft was based on, or the live one. */
async function baseBody(lessonId: string, versionId: string): Promise<Lesson> {
  const { data } = await createAdminClient().from("content_versions").select("body").eq("id", versionId).eq("lesson_id", lessonId).maybeSingle();
  if (!data) throw new AdminError("conflict", "That version is gone. Reload the page.");
  return data.body as Lesson;
}

/** Saves the editor's changes as the lesson's draft. Only words change; the structure stays as it is. */
export async function saveDraft(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("content.edit");
    const lessonId = lessonIdFrom(f);
    const ed = await lessonForEditor(lessonId);
    if (!ed?.ready) throw new AdminError("failed", "Content editing needs migration 0060 first.");
    if (ed.draft?.status === "in_review") throw new AdminError("conflict", "This lesson is in review. Withdraw the release to change it.");
    const baseId = ed.draft?.baseVersionId ?? ed.base.versionId;
    if (!baseId) throw new AdminError("failed", "This lesson is not in the database yet. Run the content seed first.");
    let edits: Edits;
    let acks: string[];
    try {
      edits = editsSchema.parse(JSON.parse(String(f.get("edits") ?? "{}")));
      acks = z.array(z.string().max(200)).max(500).parse(JSON.parse(String(f.get("acks") ?? "[]")));
    } catch { throw new AdminError("invalid", "The changes could not be read. Reload the page and try again."); }
    let body: Lesson;
    try { body = applyEdits(await baseBody(lessonId, baseId), edits); } catch (e) { throw new AdminError("invalid", (e as Error).message); }
    check(await createAdminClient().rpc("admin_content_save_draft", { ...who(ctx), p_lesson: lessonId, p_base: baseId, p_body: body, p_acks: acks }));
  }, "Draft saved.");
}

export async function discardDraft(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("content.edit");
    check(await createAdminClient().rpc("admin_content_discard_draft", { ...who(ctx), p_lesson: lessonIdFrom(f), p_reason: reasonFrom(f) }));
  }, "Draft discarded.");
}

/** Sends drafts for review as one release, after the automatic checks pass for every lesson. */
export async function sendForReview(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("content.edit");
    const lessons = [...new Set(f.getAll("lessons").map(String))].filter((l) => LESSON_ID.test(l));
    if (!lessons.length) throw new AdminError("invalid", "Pick at least one lesson.");
    const title = textFrom(f, "title", 140, true, "a title")!;
    if (title.length < 3) throw new AdminError("invalid", "Write a title of at least 3 characters.");
    const note = textFrom(f, "note", 1000);
    const results: { lesson: string; ok: boolean; checks: ReturnType<typeof lessonChecks>["checks"] }[] = [];
    // The draft each check ran on: the database refuses if any was saved again since (another editor in between).
    const drafts: Record<string, string> = {};
    for (const l of lessons) {
      const ed = await lessonForEditor(l);
      if (!ed?.draft) throw new AdminError("invalid", `${l} has no draft.`);
      const r = lessonChecks(await baseBody(l, ed.draft.baseVersionId), ed.draft.body, ed.draft.acks);
      results.push({ lesson: l, ok: r.ok, checks: r.checks });
      drafts[l] = ed.draft.updatedAt;
    }
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      const first = failed[0].checks.filter((c) => !c.ok).map((c) => c.detail ?? c.label).join("; ");
      throw new AdminError("invalid", `${failed.map((r) => r.lesson).join(", ")} failed a check: ${first}. Fix it in the editor first.`);
    }
    check(await createAdminClient().rpc("admin_content_submit", { ...who(ctx), p_title: title, p_note: note, p_lessons: lessons, p_checks: { ok: true, lessons: results, drafts } }));
  }, "Sent for review. Another publisher will review it.");
}

export async function withdrawRelease(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("content.edit", "content.publish");
    check(await createAdminClient().rpc("admin_content_withdraw", { ...who(ctx), p_release: uuidFrom(f.get("release")) }));
  }, "Release withdrawn. The drafts can be edited again.");
}

export async function declineRelease(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("content.publish");
    check(await createAdminClient().rpc("admin_content_decline", { ...who(ctx), p_release: uuidFrom(f.get("release")), p_note: reasonFrom(f) }));
  }, "Sent back to the authors with your note.");
}

/** Publishing reaches every learner of these lessons: a fresh two-step code and the typed release title are asked. */
export async function publishRelease(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("content.publish");
    const id = uuidFrom(f.get("release"));
    const { data: rel } = await createAdminClient().from("content_releases").select("title").eq("id", id).maybeSingle();
    if (!rel) throw new AdminError("conflict", "That release is gone. Reload the page.");
    if (String(f.get("typed") ?? "").trim() !== "PUBLISH") throw new AdminError("invalid", "Type PUBLISH to confirm.");
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_content_publish", { ...who(ctx), p_release: id, p_note: textFrom(f, "reason", 500) }));
  }, "Published. Learners get it on their next lesson start.");
}

export async function rollbackRelease(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("content.publish");
    if (String(f.get("typed") ?? "").trim() !== "ROLL BACK") throw new AdminError("invalid", "Type ROLL BACK to confirm.");
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_content_rollback", { ...who(ctx), p_release: uuidFrom(f.get("release")), p_reason: reasonFrom(f) }));
  }, "Rolled back. The change is kept as a draft.");
}

/** QLT-2: the team's decision on a step (to check, fixing, fixed, won't fix). Closing one needs quality.manage. */
export async function setQualityStatus(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const status = String(f.get("status") ?? "");
    if (!["to_check", "fixing", "fixed", "wont_fix"].includes(status)) throw new AdminError("invalid", "Pick a status.");
    const ctx = await actionAdmin(status === "fixed" || status === "wont_fix" ? "quality.manage" : "content.edit");
    const lesson = lessonIdFrom(f);
    const step = String(f.get("step") ?? "");
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(step)) throw new AdminError("invalid", "Something is missing. Reload the page and try again.");
    const source = ["learners", "numbers", "team"].includes(String(f.get("source"))) ? String(f.get("source")) : "team";
    const note = textFrom(f, "note", 1000);
    if (status === "wont_fix" && (!note || note.length < 3)) throw new AdminError("invalid", "Say why it will not be fixed.");
    check(await createAdminClient().rpc("admin_set_flag_status", { ...who(ctx), p_lesson: lesson, p_step: step, p_source: source, p_status: status, p_note: note, p_misconception: textFrom(f, "misconception", 60) }));
  }, "Saved.");
}

/**
 * Hands a panel-owned lesson back to the content files (0064): the version this app was built with goes live, and later
 * content PRs update the lesson again. Needs content.publish, a reason, ROLL BACK typed and a fresh code.
 */
export async function handBackLesson(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("content.publish");
    const lesson = lessonIdFrom(f);
    if (String(f.get("typed") ?? "").trim() !== lesson) throw new AdminError("invalid", `Type ${lesson} to confirm.`);
    const meta = getLessonMeta(lesson);
    if (!meta) throw new AdminError("invalid", "That lesson is not in the content files.");
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_content_handback", { ...who(ctx), p_lesson: lesson, p_hash: meta.hash, p_reason: reasonFrom(f) }));
  }, "Handed back. Learners get the content files' version, and content PRs update this lesson again.");
}
