import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { ProfileForm } from "@/components/app/ProfileForm";
import { buildPathView, pickPath } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const path = pickPath(me.recommendedPathId)!;
  const view = buildPathView(path.id, me.progress, me.practicedSkills)!;
  let email = "";
  let reminder = "";
  if (me.db) {
    email = (await me.db.auth.getUser()).data.user?.email ?? "";
    const { data } = await me.db.from("profiles").select("reminder_time").eq("user_id", me.userId).maybeSingle();
    reminder = data?.reminder_time?.slice(0, 5) ?? "";
  } else email = "nour@example.com";
  return (
    <Shell pathId={path.id} pathTitle={path.title.en} units={view.units.map((u) => ({ id: u.unit.id, title: u.unit.title[locale as "en" | "ar"] }))}>
      <ProfileForm initial={{ displayName: me.progress.displayName ?? "", dailyGoal: me.progress.dailyGoal as 1 | 2 | 3, reminder }} email={email} />
    </Shell>
  );
}
