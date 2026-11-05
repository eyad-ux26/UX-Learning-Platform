import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { ProfileForm } from "@/components/app/ProfileForm";
import { ProfileMain } from "@/components/app/ProfileMain";
import { requireLearner } from "@/lib/server/learner";
import { ensureCertificates } from "@/lib/server/certificates";
import { Link } from "@/i18n/navigation";
import { BellLink } from "@/components/account/BellLink";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("profile");
  let email = "";
  let reminder = "";
  let boardOpen = false;
  if (me.db) {
    email = (await me.db.auth.getUser()).data.user?.email ?? "";
    const [{ data }, { data: flag }] = await Promise.all([
      me.db.from("profiles").select("reminder_time").eq("user_id", me.userId).maybeSingle(),
      me.db.from("app_flags").select("enabled").eq("key", "leaderboard").maybeSingle(),
    ]);
    reminder = data?.reminder_time?.slice(0, 5) ?? "";
    boardOpen = !!flag?.enabled;
  } else email = "nour@example.com";
  const certificates = me.db ? await ensureCertificates(me.userId, me.joined.map((j) => j.pathId), me.skillStates) : [];
  return (
    <Shell me={me}>
      <div className="s4-bar">
        <Link href="/app/settings" className="bell-link" aria-label={(await getTranslations("settings"))("title")}><span className="ph ph-gear" aria-hidden="true" /></Link>
        <BellLink me={me} />
      </div>
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      <ProfileMain me={me} certificates={certificates} boardOpen={boardOpen} />
      <ProfileForm initial={{ displayName: me.progress.displayName ?? "", dailyGoal: me.progress.dailyGoal as 1 | 2 | 3, reminder }} email={email} userId={me.userId} />
    </Shell>
  );
}
