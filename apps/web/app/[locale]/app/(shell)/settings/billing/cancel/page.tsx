import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Shell } from "@/components/app/Shell";
import { CancelForm } from "@/components/billing/BillingActions";
import { requireLearner } from "@/lib/server/learner";
import { loadBilling } from "@/lib/server/billing/account";
import { formatDate, shellFor } from "@/lib/server/billing/page";

export const dynamic = "force-dynamic";

const REASONS = ["price", "time", "done", "paths", "broken", "other"] as const;

export default async function CancelPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("billing");
  const v = await loadBilling(me.db, me.userId, sp.state);
  if (!v.sub || !["active", "grace"].includes(v.sub.status)) return redirect({ href: "/app/settings/billing", locale }) as never;
  // In the grace period nothing is paid ahead, so Pro ends now; otherwise at the end of the paid period.
  const until = formatDate(v.sub.status === "grace" ? new Date().toISOString() : v.sub.currentPeriodEnd, locale);
  const keeps = [["ph ph-calendar", t("keeps.k1t", { date: until }), t("keeps.k1s")], ["ph ph-check-circle-fill", t("keeps.k2t"), t("keeps.k2s")], ["ph ph-lock-open", t("keeps.k3t"), t("keeps.k3s")], ["ph ph-x-circle", t("keeps.k4t"), t("keeps.k4s")]];
  return (
    <Shell {...shellFor(me)}>
      <header className="pg-top" style={{ gap: 4 }}>
        <Link href="/app/settings/billing" className="icon-btn plain" aria-label={t("back")}><span className="ph ph-arrow back" aria-hidden="true" /></Link>
        <h1 className="pg-title" style={{ flex: 1 }}>{t("tCancel")}</h1>
      </header>
      <div className="pg-cols">
        <div className="pg-stack" style={{ gap: 10 }}>
          <p className="t-body" style={{ fontSize: 15 }}>{t("cxLead")}</p>
          <div className="why-list">
            {keeps.map(([icon, title, sub]) => <div key={title} className="why-row is-done" style={{ minHeight: 52 }}><span className={icon} aria-hidden="true" /><span className="grow"><b>{title}</b><span>{sub}</span></span></div>)}
          </div>
          <p className="pg-note" style={{ fontSize: 13 }}><span className="ph ph-refund" aria-hidden="true" /><span>{t("cxRefund")}</span></p>
        </div>
        <CancelForm reasons={REASONS.map((id) => ({ id, label: t(`reasons.${id}`) }))} />
      </div>
    </Shell>
  );
}
