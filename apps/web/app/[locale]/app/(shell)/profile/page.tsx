import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { ProfileForm } from "@/components/app/ProfileForm";
import { ProfileMain } from "@/components/app/ProfileMain";
import { requireLearner } from "@/lib/server/learner";
import { buildPathView, pickPath } from "@/lib/learning";
import { loadProfileData } from "@/lib/server/profile";
import { ProfilePlan } from "@/components/billing/ProfilePlan";
import { PaywallSheet } from "@/components/billing/PaywallSheet";
import { formatMoney } from "@/lib/billing/pricing";
import { loadOffer } from "@/lib/server/billing/plans";
import { Link } from "@/i18n/navigation";
import { BellLink } from "@/components/account/BellLink";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ paywall?: string }> }) {
  const { locale } = await params;
  const { paywall } = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("profile");
  const path = pickPath(me.activePathId)!;
  const view = buildPathView(path.id, me.progress, me.practicedSkills)!;
  // Usually no database call here: the rest came with the learner (issue #184).
  const { email, reminder, since, boardOpen, certificates } = await loadProfileData(me);
  const offer = !me.pro && paywall === "cert" ? await loadOffer(me) : null;
  return (
    <Shell me={me}>
      <div className="s4-bar">
        <Link href="/app/settings" className="bell-link" aria-label={(await getTranslations("settings"))("title")}><span className="ph ph-gear" aria-hidden="true" /></Link>
        <BellLink me={me} />
      </div>
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      <ProfileMain me={me} certificates={certificates} boardOpen={boardOpen} since={since} />
      <ProfileForm initial={{ displayName: me.progress.displayName ?? "", dailyGoal: me.progress.dailyGoal as 1 | 2 | 3, reminder }} email={email} userId={me.userId} />
      <ProfilePlan pro={me.pro} pathTitle={path.title.en} pct={view.totalCount ? Math.round((view.doneCount / view.totalCount) * 100) : 0} />
      {offer ? <PaywallSheet kind="cert" prices={{ month: formatMoney(offer.month.amount, offer.month.currency, locale as "en" | "ar"), year: formatMoney(offer.year.amount, offer.year.currency, locale as "en" | "ar") }} /> : null}
    </Shell>
  );
}
