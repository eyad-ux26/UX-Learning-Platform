import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { unitOpen } from "@/lib/billing/access";
import { setRequestLocale } from "next-intl/server";
import { getPath, getUnit } from "@uxgate/content";
import { getBank } from "@/lib/server/content";
import type { Lesson, Locale } from "@uxgate/content/types";
import { MasteryGate } from "@/components/lesson/MasteryGate";
import { MasteryLocked, MasteryNone } from "@/components/lesson/LessonPages";
import { requireLearner } from "@/lib/server/learner";
import { loadRound } from "@/lib/server/mastery";
import { otherLocaleMessages } from "@/lib/server/lesson-messages";

export const dynamic = "force-dynamic";

/** The mastery round of a unit: every skill missed in the unit comes back with a variant the learner has not seen. */
export default async function MasteryPage({ params }: { params: Promise<{ locale: string; unitId: string }> }) {
  const { locale, unitId } = await params;
  setRequestLocale(locale);
  const [me, bank, other] = await Promise.all([requireLearner(locale), getBank(unitId), otherLocaleMessages(locale)]);
  const unit = getUnit(unitId);
  if (!unit || !bank || !me.db) notFound();
  const back = `/app/path/${unit.pathId}`;
  // A Pro unit's re-test questions are Pro content too (issue #137): without Pro the path map opens with the paywall.
  if (!unitOpen(unit, me.pro)) return redirect({ href: `${back}?paywall=${unitId}`, locale }) as never;
  const round = await loadRound(me.db, me.userId, unitId);
  if (!round || !round.skillCheckDone) return <MasteryLocked backHref={back} userId={me.userId} />;
  if (!round.steps.length) return <MasteryNone backHref={back} usedUp={round.unresolved.length > 0} />;
  const lesson: Lesson = { ...bank.body, id: bank.lessonId, mode: "bank", steps: round.steps };
  const skills = unit.skills.filter((k) => round.steps.some((s) => s.skill === k.id));
  return (
    <MasteryGate
      lesson={lesson}
      hash={bank.hash}
      locale={locale as Locale}
      pathLabel={getPath(unit.pathId)?.title.en ?? unit.pathId}
      unitId={unitId}
      userId={me.userId}
      plan={round.steps.map((s) => s.id)}
      skills={skills}
      allSkills={unit.skills}
      backHref={back}
      other={other}
    />
  );
}
