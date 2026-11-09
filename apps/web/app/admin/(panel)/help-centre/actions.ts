"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, audit, check, run, type ActionResult } from "@/lib/admin/guard";
import { textFrom, uuidFrom } from "@/lib/admin/form";

type R = ActionResult;
const TOPICS = ["account", "learning", "billing", "certificates", "technical"];

/** SUP-11: a help article in English and Arabic. Saving keeps its status; publishing is a separate step. */
export async function saveArticle(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("help.edit");
    const id = f.get("id") ? uuidFrom(f.get("id")) : null;
    const slug = String(f.get("slug") ?? "").trim().toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) throw new AdminError("invalid", "The short name uses small letters, numbers and dashes, for example reset-password.");
    const topic = String(f.get("topic") ?? "");
    if (!TOPICS.includes(topic)) throw new AdminError("invalid", "Pick a topic.");
    const title = { en: textFrom(f, "title_en", 120, true, "the English title")!, ar: textFrom(f, "title_ar", 120, true, "the Arabic title")! };
    const body = { en: textFrom(f, "body_en", 8000, true, "the English answer")!, ar: textFrom(f, "body_ar", 8000, true, "the Arabic answer")! };
    if (title.en.length < 3 || title.ar.length < 3) throw new AdminError("invalid", "Write the title in English and Arabic.");
    if (body.en.length < 10 || body.ar.length < 10) throw new AdminError("invalid", "Write the answer in English and Arabic (at least 10 characters each).");
    const row = { slug, topic, title, body, updated_by: ctx.userId, updated_at: new Date().toISOString() };
    const db = createAdminClient();
    const r = id ? await db.from("help_articles").update(row).eq("id", id).select("id").single() : await db.from("help_articles").insert(row).select("id").single();
    if (r.error?.code === "23505") throw new AdminError("invalid", "Another article already uses that short name.");
    const saved = check(r) as { id: string };
    await audit(ctx, id ? "help.edited" : "help.created", "support", { type: "help_article", id: saved.id, label: title.en }, { after: { slug, topic } });
  }, "Saved.");
}

export async function publishArticle(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("help.edit");
    const id = uuidFrom(f.get("id"));
    const on = f.get("on") === "1";
    const db = createAdminClient();
    const { data: a } = await db.from("help_articles").select("title, status").eq("id", id).maybeSingle();
    if (!a) throw new AdminError("conflict", "That article is gone. Reload the page.");
    check(await db.from("help_articles").update({ status: on ? "published" : "draft", published_at: on ? new Date().toISOString() : null, updated_by: ctx.userId, updated_at: new Date().toISOString() }).eq("id", id));
    await audit(ctx, on ? "help.published" : "help.unpublished", "support", { type: "help_article", id, label: (a.title as { en: string }).en }, { before: { status: a.status } });
  }, "Done. Learners see the change on their next visit to Help.");
}

export async function deleteArticle(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("help.edit");
    const id = uuidFrom(f.get("id"));
    const db = createAdminClient();
    const { data: a } = await db.from("help_articles").select("slug, title, body, topic, status").eq("id", id).maybeSingle();
    if (!a) throw new AdminError("conflict", "That article is gone. Reload the page.");
    if (a.status === "published") throw new AdminError("invalid", "Unpublish it first.");
    check(await db.from("help_articles").delete().eq("id", id));
    await audit(ctx, "help.deleted", "support", { type: "help_article", id, label: (a.title as { en: string }).en }, { before: a });
  }, "Deleted.");
}
