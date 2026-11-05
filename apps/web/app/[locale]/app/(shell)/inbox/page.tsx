import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { AccountFrame } from "@/components/account/AccountFrame";
import { InboxView } from "@/components/account/InboxView";
import { requireLearner } from "@/lib/server/learner";
import { loadInbox } from "@/lib/server/inbox";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "inbox" });
  return { title: `${t("title")} · UXGate`, robots: { index: false } };
}

export default async function InboxPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const rows = await loadInbox(me.db, me.userId);
  return (
    <AccountFrame me={me} locale={locale}>
      <InboxView rows={rows} />
    </AccountFrame>
  );
}
