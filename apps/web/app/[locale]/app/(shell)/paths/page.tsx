import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { PathsMain } from "@/components/app/PathsView";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function PathsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  return <Shell me={me}><PathsMain me={me} /></Shell>;
}
