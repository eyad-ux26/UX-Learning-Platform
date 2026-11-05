import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { AccountFrame } from "@/components/account/AccountFrame";
import { PageTop } from "@/components/account/PageTop";
import { NotifsView } from "@/components/account/NotifsView";
import { requireLearner } from "@/lib/server/learner";
import { loadPrefs } from "@/lib/server/notify";
import { DEFAULT_PREFS } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "notifs" });
  return { title: `${t("title")} · UXGate`, robots: { index: false } };
}

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("notifs");
  const s = await getTranslations("settings");
  let prefs = DEFAULT_PREFS;
  let reminder: string | null = "20:00";
  if (me.db) {
    prefs = await loadPrefs(me.db, me.userId);
    const { data } = await me.db.from("profiles").select("reminder_time").eq("user_id", me.userId).maybeSingle();
    reminder = data?.reminder_time ? String(data.reminder_time).slice(0, 5) : null;
  }
  return (
    <AccountFrame me={me} locale={locale}>
      <PageTop title={t("title")} back="/app/settings" backLabel={s("back")} />
      <NotifsView initial={prefs} reminder={reminder} />
    </AccountFrame>
  );
}
