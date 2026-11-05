import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { AccountFrame } from "@/components/account/AccountFrame";
import { PageTop } from "@/components/account/PageTop";
import { SettingsView } from "@/components/account/SettingsView";
import { requireLearner } from "@/lib/server/learner";
import type { ThemePref } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "settings" });
  return { title: `${t("title")} · UXGate`, robots: { index: false } };
}

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ restored?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("settings");
  let boardOpen = false;
  let initial = { name: me.progress.displayName ?? "", email: "nour@example.com", provider: "email", theme: "system" as ThemePref, goal: me.progress.dailyGoal as 1 | 2 | 3, reminder: "20:00" as string | null };
  if (me.db) {
    const [{ data: auth }, { data: prof }, { data: flag }] = await Promise.all([
      me.db.auth.getUser(),
      me.db.from("profiles").select("display_name, theme, daily_goal, reminder_time").eq("user_id", me.userId).maybeSingle(),
      me.db.from("app_flags").select("enabled").eq("key", "leaderboard").maybeSingle(),
    ]);
    boardOpen = !!flag?.enabled;
    const u = auth.user;
    initial = {
      name: prof?.display_name ?? "",
      email: u?.email ?? "",
      provider: (u?.app_metadata?.provider as string | undefined) ?? "email",
      theme: (prof?.theme as ThemePref | undefined) ?? "system",
      goal: (prof?.daily_goal ?? 1) as 1 | 2 | 3,
      reminder: prof?.reminder_time ? String(prof.reminder_time).slice(0, 5) : null,
    };
  }
  return (
    <AccountFrame me={me} locale={locale}>
      <PageTop title={t("title")} back="/app/profile" backLabel={t("back")} />
      <SettingsView initial={initial} userId={me.userId} restored={(await searchParams).restored === "1"} sharing={{ pageOn: me.shareEnabled, boardJoined: me.leaderboardJoined, boardOpen }} />
    </AccountFrame>
  );
}
