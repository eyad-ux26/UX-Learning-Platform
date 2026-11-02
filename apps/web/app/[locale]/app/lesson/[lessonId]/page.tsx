import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getLessonVersion, getPath, getUnit } from "@uxgate/content";
import type { Locale } from "@uxgate/content/types";
import { LessonRunner } from "@/components/LessonRunner";
import { redirect } from "@/i18n/navigation";
import { buildPathView } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";
import { decideReplay } from "@/lib/replay";

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
  const pathTitle = getPath(version.pathId)?.title.en ?? version.pathId;
  // Playing a finished lesson again is a replay: half XP the first time each day, nothing after that.
  let replay = null as ReturnType<typeof decideReplay>;
  if (me.progress.finishedLessons.includes(lessonId)) {
    // Only finished paid replays count here, so resuming the replay in progress still shows it as paid.
    const paid = me.db ? await me.db.from("attempts").select("started_at").eq("lesson_id", lessonId).eq("replay_kind", "paid").not("finished_at", "is", null) : null;
    replay = decideReplay(true, (paid?.data ?? []).map((p) => p.started_at as string), new Date(), me.timeZone);
  }
  return <LessonRunner lesson={version.body} hash={version.hash} locale={locale as Locale} pathLabel={pathTitle} lessonNo={version.order + 1} userId={me.userId} unitId={unit?.id ?? version.unitId} unitSkills={unit?.skills ?? []} streak={me.progress.streak + (me.progress.lessonsToday > 0 || replay === "unpaid" ? 0 : 1)} replay={replay} />;
}
