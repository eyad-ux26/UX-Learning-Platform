import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Shell } from "@/components/app/Shell";
import { PrintButton } from "@/components/billing/BillingActions";
import { formatMoney, moneyCls } from "@/lib/billing/pricing";
import { requireLearner } from "@/lib/server/learner";
import { loadBilling } from "@/lib/server/billing/account";
import { cardName } from "@/lib/server/billing/view";
import { formatDate, shellFor } from "@/lib/server/billing/page";

export const dynamic = "force-dynamic";

/** A receipt the learner can print or save as PDF. Paddle also emails its own invoice as merchant of record. */
export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale, id } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("billing");
  const v = await loadBilling(me, sp.state);
  const p = v.payments.find((x) => x.id === id);
  if (!p) notFound();
  const L = locale as "en" | "ar";
  const rows = [
    [t("rcDate"), formatDate(p.paidAt, locale, true)],
    [t("rcPlan"), p.period === "year" ? t("lineY") : t("lineM")],
    [t("rcPeriod"), `${formatDate(p.paidAt, locale, true)} – ${formatDate(p.periodEnd, locale, true)}`],
    [t("rcPaidWith"), cardName(t, p)],
    [t("rcStatus"), p.status === "refunded" ? t("refundedSt") : t("paid")],
    [t("rcSeller"), p.provider === "paddle" ? t("rcSellerPaddle") : t("rcSellerPaymob")],
  ];
  return (
    <Shell {...shellFor(me)}>
      <header className="pg-top no-print" style={{ gap: 4 }}>
        <Link href="/app/settings/billing" className="icon-btn plain" aria-label={t("back")}><span className="ph ph-arrow back" aria-hidden="true" /></Link>
        <h1 className="pg-title" style={{ flex: 1 }}>{t("tReceipt")}</h1>
      </header>
      <article className="card rc" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 className="t-h2" style={{ fontSize: 20 }}><bdi>{t("rcTitle", { no: p.receiptNo })}</bdi></h2>
        <div className="sum">
          {rows.map(([k, val]) => <div key={k} className="sum-row"><span>{k}</span><b>{val}</b></div>)}
          <div className="sum-row total"><span>{t("rcAmount")}</span><b><span className={moneyCls(p.currency)}>{formatMoney(p.amountMinor, p.currency, L)}</span></b></div>
        </div>
        <p className="t-small ink-3 ltr" style={{ textAlign: "start" }}>UXGate · uxgate.org · support@uxgate.org</p>
      </article>
      <div className="rc"><PrintButton label={t("rcPrint")} /></div>
    </Shell>
  );
}
