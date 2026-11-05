import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Shell } from "@/components/app/Shell";
import { Toast } from "@/components/billing/Toast";
import { formatMoney } from "@/lib/billing/pricing";
import { requireLearner } from "@/lib/server/learner";
import { loadBilling } from "@/lib/server/billing/account";
import { formatDate, shellFor } from "@/lib/server/billing/page";

export const dynamic = "force-dynamic";

/** My requests: refund requests with their answers. (Slice 4's support requests can join this list at merge.) */
export default async function RequestsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("billing");
  const v = await loadBilling(me.db, me.userId, sp.state);
  const pay = (id: string) => v.payments.find((p) => p.id === id);
  const st = { waiting: ["st st-wait", "ph ph-hourglass", t("waiting")], approved: ["st st-yes", "ph ph-check", t("approved")], declined: ["st st-off", "ph ph-x", t("declined")] } as const;
  return (
    <Shell {...shellFor(me, locale)}>
      <header className="pg-top" style={{ gap: 4 }}>
        <Link href="/app/settings/billing" className="icon-btn plain" aria-label={t("back")}><span className="ph ph-arrow back" aria-hidden="true" /></Link>
        <h1 className="pg-title" style={{ flex: 1 }}>{t("tRequests")}</h1>
      </header>
      <div className="pg-cols">
        <div className="pg-stack" style={{ gap: 10 }}>
          <p className="t-small ink-2" style={{ fontSize: 14 }}>{t("rqLead")}</p>
          {v.requests.length ? v.requests.map((r) => {
            const [cls, icon, label] = st[r.status];
            const p = pay(r.paymentId);
            return (
              <article key={r.id} className={`req${r.status === "waiting" ? " is-new" : ""}`}>
                <div className="req-top">
                  <span className="ph ph-refund" style={{ fontSize: 22, color: r.status === "waiting" ? "var(--link)" : "var(--ink-3)" }} aria-hidden="true" />
                  <span className="grow">
                    <b>{t("rqRefundT", { amount: formatMoney(r.amountMinor, r.currency, locale as "en" | "ar"), date: formatDate(p?.paidAt ?? r.createdAt, locale) })}</b>
                    <span className="t-small ink-3" style={{ fontSize: 12, fontWeight: 700 }}>{r.answeredAt ? t("rqAnswered", { date: formatDate(r.answeredAt, locale) }) : t("rqSent", { date: formatDate(r.createdAt, locale) })}</span>
                  </span>
                  <span className={cls}><span className={icon} aria-hidden="true" />{label}</span>
                </div>
                <p className="req-why">“{r.reason}”</p>
              </article>
            );
          }) : <p className="pg-note"><span className="ph ph-tray" aria-hidden="true" /><span>{t("rqNone")}</span></p>}
        </div>
        <section className="card bl-desk" style={{ padding: 18, gap: 10 }}>
          <h2 className="t-over">{t("rqNextT")}</h2>
          <p className="pg-note" style={{ fontSize: 14 }}><span className="ph ph-mail" aria-hidden="true" /><span>{t("rqNext.a")}</span></p>
          <p className="pg-note" style={{ fontSize: 14 }}><span className="ph ph-lock-open" aria-hidden="true" /><span>{t("rqNext.b")}</span></p>
          <p className="pg-note" style={{ fontSize: 14 }}><span className="ph ph-credit-card" aria-hidden="true" /><span>{t("rqNext.c")}</span></p>
        </section>
      </div>
      <Toast text={sp.done === "sent" ? t("rqToast") : null} />
    </Shell>
  );
}
