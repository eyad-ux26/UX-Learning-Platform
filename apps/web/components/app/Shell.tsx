/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/Logo";
import type { Locale } from "@uxgate/content";
import { catalogEntry, pathArtUrl } from "@/lib/catalog";
import { buildPathView } from "@/lib/learning";
import type { Learner } from "@/lib/server/learner";
import { appItems } from "@/lib/nav";
import { BottomNav, RailItems, RailSound } from "./AppNav";
import { TeamBar, TeamPill } from "./TeamView";

/** The signed-in frame: left rail and side panel on a laptop, bottom toolbar on a phone. */
export async function Shell({ me, panel, children }: { me: Learner; panel?: React.ReactNode; children: React.ReactNode }) {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as Locale;
  const items = appItems();
  const joined = me.joined.length ? me.joined.map((j) => j.pathId) : [me.activePathId];
  const units = buildPathView(me.activePathId, me.progress, me.practicedSkills)?.units ?? [];
  return (
    <div className={`shell${panel ? "" : " no-panel"}`}>
      <div className="shell-rail">
        <Logo height={34} />
        {me.teamView ? <TeamPill /> : null}
        <nav aria-label={t("label")} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <RailItems items={items} />
        </nav>
        <div className="dk-sec"><span className="ph ph-stack" aria-hidden="true" />{t("yourPaths")}</div>
        {joined.map((id) => {
          const e = catalogEntry(id);
          const on = id === me.activePathId;
          return (
            <div key={id} style={{ display: "contents" }}>
              <Link href={`/app/path/${id}`} className={`dk-layer${on ? " is-on" : ""}`} aria-current={on ? "true" : undefined}>
                
                <img src={pathArtUrl(id)} alt="" style={{ inlineSize: 22, blockSize: 22, flex: "none" }} /><span className="ltr" style={{ flex: 1, minInlineSize: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e?.name ?? id}</span>
              </Link>
              {on ? units.map((u) => <Link key={u.unit.id} href={`/app/path/${id}`} className="dk-layer" style={{ paddingInlineStart: 30 }}><span className="ph ph-hash" aria-hidden="true" />{u.unit.title[locale]}</Link>) : null}
            </div>
          );
        })}
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
