import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { PathDetailMain } from "@/components/app/PathsView";
import { catalogEntry, isPlayable } from "@/lib/catalog";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function PathDetailPage({ params }: { params: Promise<{ locale: string; pathId: string }> }) {
  const { locale, pathId } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  // A Coming soon path has nothing to open: it is a 404, not an empty page.
  if (!catalogEntry(pathId) || !isPlayable(pathId)) notFound();
  return (
    <Shell me={me}>
      <PathDetailMain me={me} pathId={pathId} />
    </Shell>
  );
}
