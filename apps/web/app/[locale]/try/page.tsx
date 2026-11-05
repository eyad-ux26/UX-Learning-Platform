import { setRequestLocale } from "next-intl/server";
import { getLessonVersion, getPath, getUnit } from "@uxgate/content";
import type { Locale } from "@uxgate/content/types";
import { LessonRunner, GUEST_ID } from "@/components/LessonRunner";

/** The sample lesson from the landing page. No account needed; answers stay on this device until the learner signs up. */
const SAMPLE_LESSON = "P01-U01-L01";

export default async function TryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const v = (await getLessonVersion(SAMPLE_LESSON))!;
  return (
    <LessonRunner
      lesson={v.body} hash={v.hash} locale={locale as Locale} pathLabel={getPath(v.pathId)?.title.en ?? v.pathId}
      unitSkills={getUnit(v.unitId)?.skills ?? []} lessonNo={v.order + 1} unitId={v.unitId} streak={0} userId={GUEST_ID} replay={null} guest
    />
  );
}
