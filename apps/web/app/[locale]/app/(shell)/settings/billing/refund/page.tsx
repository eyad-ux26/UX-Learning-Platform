import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Shell } from "@/components/app/Shell";
import { RefundForm } from "@/components/billing/BillingActions";
import { formatMoney, moneyCls } from "@/lib/billing/pricing";
import { requireLearner } from "@/lib/server/learner";
import { loadBilling } from "@/lib/server/billing/account";
import { cardName, refundTarget } from "@/lib/server/billing/view";
import { formatDate, shellFor } from "@/lib/server/billing/page";

export const dynamic = "force-dynamic";

/** A refund request for the latest charge, within 7 days of it. Later, Plan and billing explains and points to support. */
export default async function RefundPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("billing");
  const v = await loadBilling(me, sp.state);
  const rt = refundTarget(v);
  if (!rt) return redirect({ href: "/app/settings/billing", locale }) as never;
  if (!rt.window.ok) return redirect({ href: rt.window.reason === "asked" ? "/app/settings/billing/requests" : "/app/settings/billing?refund=late", locale }) as never;
  const p = rt.payment;
  const rows = [["ph ph-chat-text", t("rf.r1t"), t("rf.r1s")], ["ph ph-credit-card", t("rf.r2t"), t("rf.r2s")], ["ph ph-lock", t("rf.r3t"), t("rf.r3s")]];
  return (
    <Shell {...shellFor(me)}>
      <header className="pg-top" style={{ gap: 4 }}>
        <Link href="/app/settings/billing" className="icon-btn plain" aria-label={t("back")}><span className="ph ph-arrow back" aria-hidden="true" /></Link>
        <h1 className="pg-title" style={{ flex: 1 }}>{t("tRefund")}</h1>
      </header>
      <div className="pg-cols">
        <div className="pg-stack" style={{ gap: 10 }}>
          <div className="sum">
            <div className="sum-row"><span>{t("rfCharge")}</span><b><span className={moneyCls(p.currency)}>{formatMoney(p.amountMinor, p.currency, locale as "en" | "ar")}</span> · {formatDate(p.paidAt, locale)}</b></div>
            <div className="sum-row"><span>{t("rfPaidWith")}</span><b className="ltr">{cardName(t, p)}</b></div>
            <div className="sum-row"><span>{t("rfUntil")}</span><b>{formatDate(rt.window.until, locale)}</b></div>
          </div>
          <div className="why-list">
            {rows.map(([icon, title, sub]) => <div key={title} className="why-row" style={{ minHeight: 52 }}><span className={icon} style={{ color: "var(--ink-2)" }} aria-hidden="true" /><span className="grow"><b>{title}</b><span>{sub}</span></span></div>)}
          </div>
        </div>
        <RefundForm paymentId={p.id} />
      </div>
    </Shell>
  );
}
