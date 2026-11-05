import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SystemView, sysBtn } from "@/components/public/SystemView";

// Shown for every page while UG_MAINTENANCE=1 (middleware.ts rewrites to it with a 503 and Retry-After).
// UG_MAINTENANCE_UNTIL (an ISO time, e.g. 2026-11-20T18:00:00Z) gives the "back by" time; without it the page says "soon".
export const dynamic = "force-dynamic";

/** "6:00 PM" / "6:00 م" in Cairo time, or null when no valid end time is set. */
function backBy(locale: string): string | null {
  const v = process.env.UG_MAINTENANCE_UNTIL;
  const at = v ? new Date(v) : null;
  if (!at || Number.isNaN(at.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Cairo" }).format(at);
}

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "sys" });
  return { title: `${t("mtTitle")} · UXGate`, robots: { index: false } };
}

export default async function MaintenancePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sys");
  const time = backBy(locale);
  return (
    <SystemView ill="rocket" code={t("mtCode")} title={t("mtTitle")} body={time ? t("mtBody", { time }) : t("mtSoon")} safe={t("mtSafe")} foot={t("mtFoot")}>
      {/* Reloads the address the learner asked for: once maintenance ends, that page opens. */}
      <a href="" className={sysBtn(true)}><span className="ph ph-sync" aria-hidden="true" />{t("checkAgain")}</a>
    </SystemView>
  );
}
