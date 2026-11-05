import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/Logo";
import { appItems } from "@/lib/nav";
import { BottomNav, RailItems, RailSound } from "./AppNav";

/** The signed-in frame: left rail and side panel on a laptop, bottom toolbar on a phone. */
export async function Shell({ pathId, pathTitle, units, panel, children }: {
  pathId: string; pathTitle: string; units?: { id: string; title: string }[]; panel?: React.ReactNode; children: React.ReactNode;
}) {
  const t = await getTranslations("nav");
  const items = appItems(pathId);
  return (
    <div className={`shell${panel ? "" : " no-panel"}`}>
      <div className="shell-rail">
        <Logo height={34} />
        <nav aria-label={t("label")} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <RailItems items={items} />
        </nav>
        <div className="dk-sec"><span className="ph ph-stack" aria-hidden="true" />{t("yourPaths")}</div>
        <Link href={`/app/path/${pathId}`} className="dk-layer"><span className="ph ph-caret" style={{ transform: "rotate(90deg)" }} aria-hidden="true" /><span className="ltr">{pathTitle}</span></Link>
        {units?.map((u) => (
          <Link key={u.id} href={`/app/path/${pathId}`} className="dk-layer" style={{ paddingInlineStart: 30 }}><span className="ph ph-hash" aria-hidden="true" />{u.title}</Link>
        ))}
        <div style={{ flex: 1 }} />
        <RailSound />
        <LocaleSwitch />
      </div>
      <main className="shell-main">{children}</main>
      {panel ? <aside className="shell-panel">{panel}</aside> : null}
      <BottomNav items={items} />
    </div>
  );
}
