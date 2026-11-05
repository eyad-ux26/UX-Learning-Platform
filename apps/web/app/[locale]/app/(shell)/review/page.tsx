import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { ReviewMain } from "@/components/app/ReviewView";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  return <Shell me={me}><ReviewMain me={me} /></Shell>;
}
