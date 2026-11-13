import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { getUnit } from "@uxgate/content";
import { getBank } from "@/lib/server/content";
import type { Lesson, Locale } from "@uxgate/content/types";
import { LessonRunner } from "@/components/lesson/LessonRunner";
import { requireLearner } from "@/lib/server/learner";
import { loadReviewSession } from "@/lib/server/review-session";
import { localPathName } from "@/lib/catalog";
import { otherLocaleMessages } from "@/lib/server/lesson-messages";

export const dynamic = "force-dynamic";

/** A review session: the due skills of one unit, each on a new case from the unit's bank. One try each, no hints. */
export default async function ReviewSessionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const session = me.db ? await loadReviewSession(me.db, me.userId, new Date(), me.skillStates) : null;
  const unit = session ? getUnit(session.unitId) : undefined;
  const [bank, other] = await Promise.all([session ? getBank(session.unitId) : null, otherLocaleMessages(locale)]);
  if (!session || !unit || !bank) return redirect({ href: "/app/review", locale }) as never;
  const lesson: Lesson = { ...bank.body, id: bank.lessonId, mode: "bank", steps: session.steps };
  return (
    <LessonRunner
      lesson={lesson}
      hash={bank.hash}
      locale={locale as Locale}
      pathLabel={localPathName(unit.pathId, locale)}
      lessonNo={0}
      unitId={unit.id}
      streak={0}
      userId={me.userId}
      replay={null}
      other={other}
      variant="review"
      plan={session.steps.map((s) => s.id)}
      unitSkills={unit.skills.filter((k) => session.skills.includes(k.id))}
    />
  );
}
