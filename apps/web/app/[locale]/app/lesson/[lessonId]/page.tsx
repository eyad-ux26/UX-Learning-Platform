import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getLessonVersion, getPath, getUnit } from "@uxgate/content";
import type { Locale } from "@uxgate/content/types";
import { LessonRunner } from "@/components/LessonRunner";

export default async function LessonPage({ params }: { params: Promise<{ locale: string; lessonId: string }> }) {
  const { locale, lessonId } = await params;
  setRequestLocale(locale);
  const version = getLessonVersion(lessonId);
  if (!version) notFound();
  const unit = getUnit(version.unitId);
  const pathTitle = getPath(version.pathId)?.title[locale as Locale] ?? version.pathId;
  return <LessonRunner lesson={version.body} hash={version.hash} locale={locale as Locale} pathLabel={pathTitle} unitId={unit?.id ?? version.unitId} />;
}
