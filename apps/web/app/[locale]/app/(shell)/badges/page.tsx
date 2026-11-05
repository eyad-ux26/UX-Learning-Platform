import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { BadgesMain } from "@/components/app/StreakView";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function BadgesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  return <Shell me={me}><BadgesMain me={me} /></Shell>;
}
