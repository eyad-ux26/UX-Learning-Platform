import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getLessonVersion, getPath, getUnit } from "@uxgate/content";
import type { Locale } from "@uxgate/content/types";
import { LessonRunner } from "@/components/LessonRunner";
import { redirect } from "@/i18n/navigation";
import { buildPathView } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ locale: string; lessonId: string }> }) {
  const { locale, lessonId } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const version = getLessonVersion(lessonId);
  if (!version) notFound();
  // Lessons play in order: a locked lesson sends the learner back to the path map.
  const view = buildPathView(version.pathId, me.progress, me.practicedSkills);
  const state = view?.units.flatMap((u) => u.lessons).find((l) => l.lesson.lessonId === lessonId)?.state;
  if (state === "locked") return redirect({ href: `/app/path/${version.pathId}`, locale }) as never;
  const unit = getUnit(version.unitId);
  const pathTitle = getPath(version.pathId)?.title[locale as Locale] ?? version.pathId;
  return <LessonRunner lesson={version.body} hash={version.hash} locale={locale as Locale} pathLabel={pathTitle} unitId={unit?.id ?? version.unitId} />;
}
