import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SystemView, sysBtn } from "@/components/public/SystemView";

// Shown for every page while UG_MAINTENANCE=1 (middleware.ts rewrites to it with a 503 and Retry-After).
export const dynamic = "force-static";
export const revalidate = false;

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "sys" });
  return { title: `${t("mtTitle")} · UXGate`, robots: { index: false } };
}

export default async function MaintenancePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sys");
  return (
    <SystemView ill="rocket" code={t("mtCode")} title={t("mtTitle")} body={t("mtBody")} safe={t("mtSafe")} foot={t("mtFoot")}>
      {/* Reloads the address the learner asked for: once maintenance ends, that page opens. */}
      <a href="" className={sysBtn(true)}><span className="ph ph-sync" aria-hidden="true" />{t("checkAgain")}</a>
    </SystemView>
  );
}
