import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { HomeMain, HomePanel } from "@/components/app/HomeView";
import { buildPathView, pickPath } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const path = pickPath(me.recommendedPathId)!;
  const view = buildPathView(path.id, me.progress, me.practicedSkills)!;
  return (
    <Shell pathId={path.id} pathTitle={path.title.en} units={view.units.map((u) => ({ id: u.unit.id, title: u.unit.title[locale as "en" | "ar"] }))} panel={<HomePanel progress={me.progress} />}>
      <HomeMain progress={me.progress} view={view} hour={me.hour} />
    </Shell>
  );
}
