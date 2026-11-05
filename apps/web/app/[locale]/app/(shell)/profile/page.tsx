import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { ProfileForm } from "@/components/app/ProfileForm";
import { buildPathView, pickPath } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";
import { ProfilePlan } from "@/components/billing/ProfilePlan";
import { PaywallSheet } from "@/components/billing/PaywallSheet";
import { formatMoney } from "@/lib/billing/pricing";
import { loadOffer } from "@/lib/server/billing/plans";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ paywall?: string }> }) {
  const { locale } = await params;
  const { paywall } = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const path = pickPath(me.currentPathId ?? me.recommendedPathId)!;
  const view = buildPathView(path.id, me.progress, me.practicedSkills)!;
  let email = "";
  let reminder = "";
  if (me.db) {
    email = (await me.db.auth.getUser()).data.user?.email ?? "";
    const { data } = await me.db.from("profiles").select("reminder_time").eq("user_id", me.userId).maybeSingle();
    reminder = data?.reminder_time?.slice(0, 5) ?? "";
  } else email = "nour@example.com";
  const offer = !me.pro && paywall === "cert" ? await loadOffer(me) : null;
  return (
    <Shell pathId={path.id} pathTitle={path.title.en} units={view.units.map((u) => ({ id: u.unit.id, title: u.unit.title[locale as "en" | "ar"] }))}>
      <ProfileForm initial={{ displayName: me.progress.displayName ?? "", dailyGoal: me.progress.dailyGoal as 1 | 2 | 3, reminder }} email={email} userId={me.userId} />
      <ProfilePlan pro={me.pro} pathTitle={path.title.en} pct={view.totalCount ? Math.round((view.doneCount / view.totalCount) * 100) : 0} />
      {offer ? <PaywallSheet kind="cert" prices={{ month: formatMoney(offer.month.amount, offer.month.currency, locale as "en" | "ar"), year: formatMoney(offer.year.amount, offer.year.currency, locale as "en" | "ar") }} /> : null}
    </Shell>
  );
}
