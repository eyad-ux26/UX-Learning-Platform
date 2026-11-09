import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getLessonMeta, getPath, type Lesson, type Locale } from "@uxgate/content";
import { requireAdmin, allowed } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { lessonForEditor } from "@/lib/admin/data/content";
import { PreviewRunner } from "@/components/admin/PreviewRunner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview · UXGate", robots: { index: false, follow: false } };

// The admin panel's phone preview (lesson editor, release review): the saved draft, a release's version or the live
// version, played in the real player in the learner app's styles. Team members with content.view only.
//   ?src=draft (default) | live | release:<uuid>
export default async function PreviewPage({ params, searchParams }: { params: Promise<{ locale: string; lessonId: string }>; searchParams: Promise<{ src?: string }> }) {
  const { locale, lessonId } = await params;
  setRequestLocale(locale);
  const ctx = await requireAdmin();
  if (!allowed(ctx, "content.view")) notFound();
  const meta = getLessonMeta(lessonId);
  if (!meta) notFound();
  const src = (await searchParams).src ?? "draft";
  const ed = await lessonForEditor(lessonId);
  if (!ed) notFound();
  let body: Lesson = src === "live" ? ed.base.body : ed.draft?.body ?? ed.base.body;
  const rel = /^release:([0-9a-f-]{36})$/.exec(src)?.[1];
  if (rel) {
    const { data } = await createAdminClient().from("content_release_items").select("body").eq("release_id", rel).eq("lesson_id", lessonId).maybeSingle();
    if (!data) notFound();
    body = data.body as Lesson;
  }
  return <PreviewRunner lesson={body} hash={`preview-${ed.base.hash}`} locale={locale as Locale} pathLabel={getPath(meta.pathId)?.title[locale as Locale] ?? meta.pathId} />;
}
