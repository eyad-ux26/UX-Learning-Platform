// "Pre-launch · team view" (canvas v70, PathsPages team="on"): admins use the full tool while the public sees the Coming
// Soon page, and this badge says so on every app screen. A pill under the logo in the desktop rail, a bar on top on
// phones. Both open the public page.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function TeamPill() {
  const t = await getTranslations("soon");
  return (
    <Link href="/coming-soon" className="team-pill" aria-label={t("teamAria")}>
      <span>
        <span className="ph ph-eye" aria-hidden="true" />
        {t("teamTitle")}
      </span>
      <small>{t("teamSub")}</small>
    </Link>
  );
}

export async function TeamBar() {
  const t = await getTranslations("soon");
  return (
    <div className="team-bar-wrap">
      <Link href="/coming-soon" className="team-bar" aria-label={t("teamAria")}>
        <span className="ph ph-eye" aria-hidden="true" />
        <span className="grow">{t("teamTitle")}</span>
        <small>{t("teamSubShort")}</small>
      </Link>
    </div>
  );
}
