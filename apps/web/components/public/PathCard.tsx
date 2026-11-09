import { PathName } from "@/components/PathName";
import { localPathName } from "@/lib/catalog-list";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { artUrl, type PublicPath } from "@/lib/public-paths";

/** One path in a public list: art, name, a short line, and its kind with Unit 1 free (or Coming soon). */
export function PathCard({ p, locale, open }: { p: PublicPath; locale: Locale; open: boolean }) {
  const t = useTranslations("pathpage");
  const hyb = p.kind === "hybrid";
  return (
    <Link href={`/paths/${p.slug}`} className={`path-card pub-card${open ? " press" : " is-soon"}`}>
      <span className="pc-ill">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artUrl(p)} alt="" width={62} height={62} loading="lazy" />
      </span>
      <span className="pc-text">
        <span className="pc-name"><PathName name={localPathName(p.id, locale)} /></span>
        <span className="pc-sub">{(p.short ?? p.sub)[locale]}</span>
        <span className="pc-meta">
          {open ? (
            <>
              <span className={`kind${hyb ? " kind-hybrid" : ""}`}>{hyb ? t("hybrid") : t("interactive")}</span>
              <span className="kind kind-free">{t("free1")}</span>
            </>
          ) : (
            <span className="kind kind-soon"><span className="ph ph-hourglass" aria-hidden="true" />{t("soon")}</span>
          )}
        </span>
      </span>
      <span className="pc-end"><span className="ph ph-caret flip" aria-hidden="true" /></span>
    </Link>
  );
}
