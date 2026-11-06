import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { ProfileForm } from "@/components/app/ProfileForm";
import { ProfileMain } from "@/components/app/ProfileMain";
import { requireLearner } from "@/lib/server/learner";
import { buildPathView, pickPath } from "@/lib/learning";
import { ensureCertificates } from "@/lib/server/certificates";
import { ProfilePlan } from "@/components/billing/ProfilePlan";
import { PaywallSheet } from "@/components/billing/PaywallSheet";
import { formatMoney } from "@/lib/billing/pricing";
import { loadOffer } from "@/lib/server/billing/plans";
import { Link } from "@/i18n/navigation";
import { ProfileTabs } from "@/components/app/ProfileTabs";
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
  let email = "";
  let reminder = "";
  let boardOpen = false;
  let since: string | null = me.joined.map((j) => j.startedAt).sort()[0] ?? null;
  // Certificates are read while the profile reads below run, not after them.
  const certs = me.db ? ensureCertificates(me.userId, me.joined.map((j) => j.pathId), me.skillStates) : Promise.resolve([]);
  if (me.db) {
    // The email comes in the same round as the other reads, not before them.
    const [{ data: auth }, { data }, { data: flag }] = await Promise.all([
      me.db.auth.getUser(),
      me.db.from("profiles").select("reminder_time, created_at").eq("user_id", me.userId).maybeSingle(),
      me.db.from("app_flags").select("enabled").eq("key", "leaderboard").maybeSingle(),
    ]);
    email = auth.user?.email ?? "";
    reminder = data?.reminder_time?.slice(0, 5) ?? "";
    since = (data?.created_at as string | undefined) ?? since;
    boardOpen = !!flag?.enabled;
  } else email = "nour@example.com";
  const certificates = await certs;
  const offer = !me.pro && paywall === "cert" ? await loadOffer(me) : null;
  return (
    <Shell me={me}>
      <div className="s4-bar">
        <Link href="/app/settings" className="bell-link" aria-label={(await getTranslations("settings"))("title")}><span className="ph ph-gear" aria-hidden="true" /></Link>
        <BellLink me={me} />
      </div>
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      <ProfileTabs board={boardOpen} />
      <ProfileMain me={me} certificates={certificates} boardOpen={boardOpen} since={since} />
      <ProfileForm initial={{ displayName: me.progress.displayName ?? "", dailyGoal: me.progress.dailyGoal as 1 | 2 | 3, reminder }} email={email} userId={me.userId} />
      <ProfilePlan pro={me.pro} pathTitle={path.title.en} pct={view.totalCount ? Math.round((view.doneCount / view.totalCount) * 100) : 0} />
      {offer ? <PaywallSheet kind="cert" prices={{ month: formatMoney(offer.month.amount, offer.month.currency, locale as "en" | "ar"), year: formatMoney(offer.year.amount, offer.year.currency, locale as "en" | "ar") }} /> : null}
    </Shell>
  );
}
