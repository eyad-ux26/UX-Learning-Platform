import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/Logo";
import type { Locale } from "@uxgate/content";
import { localPathName, pathArtUrl } from "@/lib/catalog";
import { buildPathView } from "@/lib/learning";
import type { Learner } from "@/lib/server/learner";
import { appItems } from "@/lib/nav";
import { BottomNav, RailItems, RailPaths, RailSound, type RailPath } from "./AppNav";
import { TeamBar, TeamPill } from "./TeamView";

/** The signed-in frame: left rail and side panel on a laptop, bottom toolbar on a phone. */
export async function Shell({ me, panel, children }: { me: Learner; panel?: React.ReactNode; children: React.ReactNode }) {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as Locale;
  const items = appItems();
  const joined = me.joined.length ? me.joined.map((j) => j.pathId) : [me.activePathId];
  // Units of every joined path, for the caret lists in the rail.
  const rail: RailPath[] = joined.map((id) => {
    const v = buildPathView(id, me.progress, me.practicedSkills);
    const cur = v?.units.find((u) => u.lessons.some((l) => l.state !== "done"));
    return {
      id, name: localPathName(id, locale), art: pathArtUrl(id), current: id === me.activePathId,
      units: (v?.units ?? []).map((u) => ({
        id: u.unit.id, title: u.unit.title[locale],
        state: u.lessons.length > 0 && u.lessons.every((l) => l.state === "done") ? "done" : u === cur ? "current" : !me.pro && !u.unit.free || (u.lessons.length > 0 && u.lessons.every((l) => l.state === "locked")) ? "locked" : "open",
      })),
    };
  });
  return (
    <div className={`shell${panel ? "" : " no-panel"}`}>
      <div className="shell-rail">
        <Logo height={34} />
        {me.teamView ? <TeamPill /> : null}
        <nav aria-label={t("label")} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <RailItems items={items} />
        </nav>
        <div className="dk-sec"><span className="ph ph-stack" aria-hidden="true" />{t("yourPaths")}</div>
        <RailPaths paths={rail} />
        <Link href="/app/paths" className="dk-layer" style={{ color: "var(--link)" }}><span className="ph ph-plus" aria-hidden="true" />{t("addPath")}</Link>
        <div style={{ flex: 1 }} />
        <RailSound />
        <LocaleSwitch />
      </div>
      <main className="shell-main">{me.teamView ? <TeamBar /> : null}{children}</main>
      {panel ? <aside className="shell-panel">{panel}</aside> : null}
      <BottomNav items={items} />
    </div>
  );
}
