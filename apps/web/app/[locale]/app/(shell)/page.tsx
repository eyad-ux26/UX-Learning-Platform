import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { HomeMain, HomePanel } from "@/components/app/HomeView";
import { buildPathView } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const view = buildPathView(me.activePathId, me.progress, me.practicedSkills)!;
  return (
    <Shell me={me} panel={<HomePanel progress={me.progress} freezes={me.freezes} weekStart={me.weekStart} />}>
      <HomeMain me={me} view={view} />
    </Shell>
  );
}
