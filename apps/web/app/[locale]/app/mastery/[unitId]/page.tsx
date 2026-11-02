import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getBank, getPath, getUnit } from "@uxgate/content";
import type { Lesson, Locale } from "@uxgate/content/types";
import { MasteryGate } from "@/components/MasteryGate";
import { MasteryLocked, MasteryNone } from "@/components/LessonPages";
import { requireLearner } from "@/lib/server/learner";
import { loadRound } from "@/lib/server/mastery";

export const dynamic = "force-dynamic";

/** The mastery round of a unit: every skill missed in the unit comes back with a variant the learner has not seen. */
export default async function MasteryPage({ params }: { params: Promise<{ locale: string; unitId: string }> }) {
  const { locale, unitId } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const unit = getUnit(unitId);
  const bank = getBank(unitId);
  if (!unit || !bank || !me.db) notFound();
  const back = `/app/path/${unit.pathId}`;
  const round = await loadRound(me.db, me.userId, unitId);
  if (!round || !round.skillCheckDone) return <MasteryLocked backHref={back} />;
  if (!round.steps.length) return <MasteryNone backHref={back} />;
  const lesson: Lesson = { ...bank.body, id: bank.lessonId, mode: "bank", steps: round.steps };
  const skills = unit.skills.filter((k) => round.steps.some((s) => s.skill === k.id));
  return (
    <MasteryGate
      lesson={lesson} hash={bank.hash} locale={locale as Locale} pathLabel={getPath(unit.pathId)?.title.en ?? unit.pathId}
      unitId={unitId} userId={me.userId} plan={round.steps.map((s) => s.id)} skills={skills} allSkills={unit.skills} backHref={back}
    />
  );
}
