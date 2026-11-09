import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { HomeMain, HomePanel } from "@/components/app/HomeView";
import { buildPathView } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";
import { BellLink } from "@/components/account/BellLink";
import { AnnouncementBanner } from "@/components/app/AnnouncementBanner";
import { currentAnnouncement } from "@/lib/server/announcement";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const view = buildPathView(me.activePathId, me.progress, me.practicedSkills)!;
  const [news, t] = await Promise.all([currentAnnouncement(locale), getTranslations("home")]);
  return (
    <Shell me={me} panel={<HomePanel progress={me.progress} freezes={me.freezes} weekStart={me.weekStart} />}>
      <HomeMain me={me} view={view} bell={<BellLink me={me} />} banner={news ? <AnnouncementBanner a={news} open={t("announcementOpen")} close={t("dismiss")} /> : null} />
    </Shell>
  );
}
