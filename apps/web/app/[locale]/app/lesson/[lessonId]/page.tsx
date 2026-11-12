import { notFound } from "next/navigation";
import { localPathName } from "@/lib/catalog-list";
import { setRequestLocale } from "next-intl/server";
import { getUnit } from "@uxgate/content";
import { getLessonVersion } from "@/lib/server/content";
import type { Locale } from "@uxgate/content/types";
import { LessonRunner } from "@/components/LessonRunner";
import { redirect } from "@/i18n/navigation";
import { buildPathView, canPlay } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";
import { decideReplay } from "@/lib/replay";
import { paidReplayStarts } from "@/lib/server/replays";
import { upNextOf, type PathEnd } from "@/lib/up-next";
import { isShown, pathSkills } from "@/lib/certificate";
import { lessonOpen } from "@/lib/billing/access";
import { otherLocaleMessages } from "@/lib/server/lesson-messages";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ locale: string; lessonId: string }> }) {
  const { locale, lessonId } = await params;
  setRequestLocale(locale);
  // The lesson file and the learner's data load side by side.
  const [me, version, other] = await Promise.all([requireLearner(locale), getLessonVersion(lessonId), otherLocaleMessages(locale)]);
  if (!version) notFound();
  // Units after Unit 1 are part of Pro: a free learner lands on the path map with the paywall open.
  if (!lessonOpen(lessonId, me.pro)) return redirect({ href: `/app/path/${version.pathId}?paywall=${version.unitId}`, locale }) as never;
  // Lessons play in order: a locked lesson sends the learner back to the path map.
  const view = buildPathView(version.pathId, me.progress, me.practicedSkills);
  if (view && !canPlay(view, lessonId) && process.env.UG_DEV_FIXTURE !== "1") return redirect({ href: `/app/path/${version.pathId}`, locale }) as never;
  const unit = getUnit(version.unitId);
  // The last lesson of a free unit, for a free learner, ends with the next unit shown as part of Pro.
  const units = view?.units ?? [];
  const ui = units.findIndex((u) => u.unit.id === version.unitId);
  const after = ui >= 0 ? units[ui + 1] : undefined;
  const lastInUnit = ui >= 0 && units[ui].lessons[units[ui].lessons.length - 1]?.lesson.lessonId === lessonId;
  const proNext = !me.pro && lastInUnit && after && !after.unit.free ? { n: after.number, title: after.unit.title[locale as Locale] } : null;
  const pathTitle = localPathName(version.pathId, locale);
  // Playing a finished lesson again is a replay: half XP the first time each day, nothing after that.
  let replay = null as ReturnType<typeof decideReplay>;
  if (me.progress.finishedLessons.includes(lessonId)) {
    // Only finished paid replays count here, so resuming the replay in progress still shows it as paid.
    replay = decideReplay(true, await paidReplayStarts(me.db, lessonId), new Date(), me.timeZone);
  }
  // Where the end page points: the next lesson of this path, or (after its last lesson) the certificate and other paths.
  // A free learner at the end of the free unit sees the Pro card instead of a next lesson they cannot open.
  const nextLesson = view ? upNextOf(view, lessonId) : null;
  const upNext = proNext ? null : nextLesson;
  let pathEnd: PathEnd | null = null;
  if (view && !nextLesson) {
    const skills = pathSkills(version.pathId);
    const others = skills.filter((s) => !unit?.skills.some((k) => k.id === s.id));
    pathEnd = { pathId: version.pathId, pathTitle, skills: skills.length, certReady: others.every((s) => isShown(me.skillStates.get(s.id)?.state)) };
  }
  return <LessonRunner upNext={upNext} pathEnd={pathEnd} lesson={version.body} hash={version.hash} locale={locale as Locale} pathLabel={pathTitle} lessonNo={version.order + 1} unitNo={ui >= 0 ? units[ui].number : Number(/-U(\d+)/.exec(version.unitId)?.[1]) || undefined} userId={me.userId} unitId={unit?.id ?? version.unitId} unitSkills={unit?.skills ?? []} streak={me.progress.streak + (me.progress.lessonsToday > 0 || replay === "unpaid" ? 0 : 1)} replay={replay} proNext={proNext} other={other} firstLesson={me.progress.finishedLessons.length === 0 && !replay} />;
}
