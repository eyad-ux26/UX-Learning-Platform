import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { PathMapMain, PathMapPanel } from "@/components/app/PathMapView";
import { redirect } from "@/i18n/navigation";
import { isPlayable } from "@/lib/catalog";
import { buildPathView } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function PathPage({ params }: { params: Promise<{ locale: string; pathId: string }> }) {
  const { locale, pathId } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const view = buildPathView(pathId, me.progress, me.practicedSkills);
  if (!view || !isPlayable(pathId)) notFound();
  // A path the learner has not joined has no map yet: show its page, where Start joins it.
  if (!me.joined.some((j) => j.pathId === pathId)) return redirect({ href: `/app/paths/${pathId}`, locale }) as never;
  return (
    <Shell me={me} panel={<PathMapPanel view={view} />}>
      <PathMapMain view={view} me={me} />
    </Shell>
  );
}
