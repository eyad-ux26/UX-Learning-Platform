import { setRequestLocale } from "next-intl/server";
import { Onboarding } from "@/components/app/Onboarding";
import { redirect } from "@/i18n/navigation";
import { getLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await getLearner();
  if (!me) return redirect({ href: "/signin", locale }) as never;
  if (me.onboarded && process.env.UG_DEV_FIXTURE !== "1") return redirect({ href: "/app", locale }) as never;
  return <Onboarding />;
}
