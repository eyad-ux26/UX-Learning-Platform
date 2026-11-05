import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SystemView, sysBtn } from "@/components/public/SystemView";

// Static, so the service worker can keep /en/offline and /ar/offline and show them when there is no connection.
export const dynamic = "force-static";
export const revalidate = false;

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "sys" });
  return { title: `${t("offTitle")} · UXGate`, robots: { index: false } };
}

export default async function OfflinePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sys");
  return (
    <SystemView ill="offline" code={t("offCode")} title={t("offTitle")} body={t("offBody")} safe={t("offSafe")} foot={t("offFoot")}>
      {/* An empty href reloads the address the learner was on, which is what the service worker answered with this page. */}
      <a href="" className={sysBtn(true)}><span className="ph ph-sync" aria-hidden="true" />{t("retry")}</a>
    </SystemView>
  );
}
