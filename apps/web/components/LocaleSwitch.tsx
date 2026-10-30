"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitch() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      lang={other}
      className="btn btn-ghost btn-sm"
    >
      <span className="ph ph-globe" aria-hidden="true" />
      {t("switchToOther")}
    </Link>
  );
}
