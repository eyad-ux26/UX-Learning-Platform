import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { AccountFrame } from "@/components/account/AccountFrame";
import { PageTop } from "@/components/account/PageTop";
import { DataView } from "@/components/account/DataView";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "acctdata" });
  return { title: `${t("title")} · UXGate`, robots: { index: false } };
}

export default async function DataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("acctdata");
  const s = await getTranslations("settings");
  return (
    <AccountFrame me={me} locale={locale}>
      <PageTop title={t("title")} back="/app/settings" backLabel={s("back")} />
      <DataView />
    </AccountFrame>
  );
}
