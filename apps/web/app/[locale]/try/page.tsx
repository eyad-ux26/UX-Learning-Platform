import { setRequestLocale } from "next-intl/server";
import { getPath, getUnit } from "@uxgate/content";
import { getLessonVersion } from "@/lib/server/content";
import type { Locale } from "@uxgate/content/types";
import { LessonRunner, GUEST_ID } from "@/components/LessonRunner";
import { otherLocaleMessages } from "@/lib/server/lesson-messages";
import { redirect } from "@/i18n/navigation";
import { getLearner } from "@/lib/server/learner";

/** The sample lesson from the landing page. No account needed; answers stay on this device until the learner signs up. */
const SAMPLE_LESSON = "P01-U01-L01";

// A signed-in learner has no use for the guest sample: send them to the app, like the sign-in and sign-up pages do.
export const dynamic = "force-dynamic";

export default async function TryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getLearner()) return redirect({ href: "/app", locale }) as never;
  const [v0, other] = await Promise.all([getLessonVersion(SAMPLE_LESSON), otherLocaleMessages(locale)]);
  const v = v0!;
  return (
    <LessonRunner
      lesson={v.body} hash={v.hash} locale={locale as Locale} pathLabel={getPath(v.pathId)?.title.en ?? v.pathId}
      unitSkills={getUnit(v.unitId)?.skills ?? []} lessonNo={v.order + 1} unitId={v.unitId} streak={0} userId={GUEST_ID} replay={null} guest other={other}
    />
  );
}
