import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { PathMapMain, PathMapPanel } from "@/components/app/PathMapView";
import { buildPathView } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function PathPage({ params }: { params: Promise<{ locale: string; pathId: string }> }) {
  const { locale, pathId } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const view = buildPathView(pathId, me.progress, me.practicedSkills);
  if (!view) notFound();
  return (
    <Shell pathId={pathId} pathTitle={view.path.title.en} units={view.units.map((u) => ({ id: u.unit.id, title: u.unit.title[locale as "en" | "ar"] }))} panel={<PathMapPanel view={view} />}>
      <PathMapMain view={view} progress={me.progress} />
    </Shell>
  );
}
