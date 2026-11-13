import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { PathStartedMain } from "@/components/app/PathsView";
import { isPlayable } from "@/lib/catalog";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function PathStartedPage({ params }: { params: Promise<{ locale: string; pathId: string }> }) {
  const { locale, pathId } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  if (!isPlayable(pathId) || !me.joined.some((j) => j.pathId === pathId)) notFound();
  return (
    <Shell me={me}>
      <PathStartedMain me={me} pathId={pathId} />
    </Shell>
  );
}
