import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { StreakMain } from "@/components/app/StreakView";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function StreakPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  return (
    <Shell me={me}>
      <StreakMain me={me} />
    </Shell>
  );
}
