import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPath, getUnit } from "@uxgate/content";
import { getLessonVersion } from "@/lib/server/content";
import type { Locale } from "@uxgate/content/types";
import { LessonRunner } from "@/components/LessonRunner";
import { redirect } from "@/i18n/navigation";
import { buildPathView } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";
import { decideReplay } from "@/lib/replay";
import { lessonOpen } from "@/lib/billing/access";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ locale: string; lessonId: string }> }) {
  const { locale, lessonId } = await params;
  setRequestLocale(locale);
  // The lesson file and the learner's data load side by side.
  const [me, version] = await Promise.all([requireLearner(locale), getLessonVersion(lessonId)]);
  if (!version) notFound();
  // Units after Unit 1 are part of Pro: a free learner lands on the path map with the paywall open.
  if (!lessonOpen(lessonId, me.pro)) return redirect({ href: `/app/path/${version.pathId}?paywall=${version.unitId}`, locale }) as never;
  // Lessons play in order: a locked lesson sends the learner back to the path map.
  const view = buildPathView(version.pathId, me.progress, me.practicedSkills);
  const state = view?.units.flatMap((u) => u.lessons).find((l) => l.lesson.lessonId === lessonId)?.state;
  if (state === "locked" && process.env.UG_DEV_FIXTURE !== "1") return redirect({ href: `/app/path/${version.pathId}`, locale }) as never;
  const unit = getUnit(version.unitId);
  // The last lesson of a free unit, for a free learner, ends with the next unit shown as part of Pro.
  const units = view?.units ?? [];
  const ui = units.findIndex((u) => u.unit.id === version.unitId);
  const after = ui >= 0 ? units[ui + 1] : undefined;
  const lastInUnit = ui >= 0 && units[ui].lessons[units[ui].lessons.length - 1]?.lesson.lessonId === lessonId;
  const proNext = !me.pro && lastInUnit && after && !after.unit.free ? { n: after.number, title: after.unit.title[locale as Locale] } : null;
  const pathTitle = getPath(version.pathId)?.title.en ?? version.pathId;
  // Playing a finished lesson again is a replay: half XP the first time each day, nothing after that.
  let replay = null as ReturnType<typeof decideReplay>;
  if (me.progress.finishedLessons.includes(lessonId)) {
    // Only finished paid replays count here, so resuming the replay in progress still shows it as paid.
    const paid = me.db ? await me.db.from("attempts").select("started_at").eq("lesson_id", lessonId).eq("replay_kind", "paid").not("finished_at", "is", null) : null;
    replay = decideReplay(true, (paid?.data ?? []).map((p) => p.started_at as string), new Date(), me.timeZone);
  }
  return <LessonRunner lesson={version.body} hash={version.hash} locale={locale as Locale} pathLabel={pathTitle} lessonNo={version.order + 1} userId={me.userId} unitId={unit?.id ?? version.unitId} unitSkills={unit?.skills ?? []} streak={me.progress.streak + (me.progress.lessonsToday > 0 || replay === "unpaid" ? 0 : 1)} replay={replay} proNext={proNext} />;
}
