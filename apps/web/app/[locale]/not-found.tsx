import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SystemView, sysBtn } from "@/components/public/SystemView";

/** 404 inside a language. Unknown addresses reach it through [...rest]; pages call notFound() for unknown ids. */
export default function NotFound() {
  const t = useTranslations("sys");
  return (
    <SystemView ill="search" code={t("nfCode")} title={t("nfTitle")} body={t("nfBody")} foot={t("nfFoot")}>
      <Link href="/" className={sysBtn(true)}><span className="ph ph-house" aria-hidden="true" />{t("home")}</Link>
      <Link href="/paths" className={sysBtn(false)}><span className="ph ph-map" aria-hidden="true" />{t("allPaths")}</Link>
    </SystemView>
  );
}
