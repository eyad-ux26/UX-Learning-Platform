import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Shell } from "@/components/app/Shell";
import { ChangePlan, PayNow, RefundLate, ResumeButton, StartTrial, Toast } from "@/components/billing/BillingActions";
import { FreeProList } from "@/components/billing/FreeProList";
import { requireLearner } from "@/lib/server/learner";
import { loadBilling } from "@/lib/server/billing/account";
import { billingScreen } from "@/lib/server/billing/view";
import { shellFor } from "@/lib/server/billing/page";

export const dynamic = "force-dynamic";

/** Plan and billing: the plan now, what needs doing, the card, receipts, refund and cancel. Fixture: ?state=failed and so on. */
export default async function BillingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("billing");
  const v = await loadBilling(me, sp.state);
  const s = await billingScreen(v, locale);
  const toast = sp.done === "cancel" ? t("cxToast", { date: s.endDate }) : sp.done === "resume" ? t("resumeToast") : sp.done === "change" ? t("chToast", { date: s.endDate }) : sp.done === "keep" ? t("resumeToast") : null;

  return (
    <Shell {...shellFor(me)}>
      <header className="pg-top" style={{ gap: 4 }}>
        <Link href="/app/profile" className="icon-btn plain only-mobile" aria-label={t("back")}><span className="ph ph-arrow back" aria-hidden="true" /></Link>
        <h1 className="pg-title" style={{ flex: 1 }}>{t("tBilling")}</h1>
      </header>
      <div className="pg-cols">
        <div className="pg-stack" style={{ gap: 12 }}>
          {s.notice ? (
            <div className={s.notice.cls} role="status">
              <span className={s.notice.icon} aria-hidden="true" />
              <span className="grow"><b>{s.notice.t}</b><span>{s.notice.b}</span>
                {s.notice.act ? (
                  <span className="acts">
                    {s.notice.act.kind === "plans" ? <Link href="/app/plans" className="btn btn-primary btn-sm press">{s.notice.act.label}</Link>
                      : s.notice.act.kind === "trial" ? <StartTrial label={s.notice.act.label} />
                      : <PayNow kind={s.notice.act.kind} period={s.period} label={s.notice.act.label} />}
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}
          {s.plan ? (
            <section className="plan-now">
              <div className="head"><span className="pro-tag">PRO</span><span className="grow"><b>{s.plan.name}</b></span><span className={s.plan.stCls}>{s.plan.st}</span></div>
              <div className="meta">
                <div>{s.plan.k1}<b>{s.plan.v1}</b></div>
                <div>{s.plan.k2}<b>{s.plan.v2}</b></div>
              </div>
              {s.pending ? <p className="pg-note" style={{ fontSize: 13 }}><span className="ph ph-calendar" aria-hidden="true" /><span>{s.pending}</span></p> : null}
              {s.plan.resume || s.plan.change ? (
                <div className="acts">
                  {s.plan.resume === "resume" ? <ResumeButton label={t("resume")} /> : null}
                  {s.plan.resume === "restart" ? <Link href="/app/plans" className="btn btn-primary press" style={{ flex: 1 }}><span className="ph ph-retry" aria-hidden="true" />{t("restart")}</Link> : null}
                  {s.plan.change && s.change ? <ChangePlan current={v.sub!.period} pending={v.sub!.pendingPeriod} options={s.change.opts} when={s.change.when} currency={v.sub!.currency} /> : null}
                </div>
              ) : null}
            </section>
          ) : (
            <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><p className="t-over">{t("yourPlan")}</p><span className="st st-wait">{t("freePlan")}</span></div>
              <FreeProList />
              <Link href="/app/plans" className="btn btn-primary btn-block press">{t("seePlans")}</Link>
            </section>
          )}
          <div className="set">
            {s.method ? (
              <div className="set-row">
                <span className={s.method.icon} aria-hidden="true" />
                <span className="set-l"><span className="ltr" style={{ textAlign: "start" }}>{s.method.name}</span><small>{s.method.sub}</small></span>
                {s.method.update ? <PayNow kind={s.method.update} period={s.period} label={t("update")} cls="btn btn-ghost btn-sm" icon="ph ph-external" /> : null}
              </div>
            ) : null}
            <div className="set-row"><span className="ph ph-globe" aria-hidden="true" /><span className="set-l">{t("country")}<small>{s.countryLine}</small></span></div>
          </div>
        </div>
        <div className="pg-stack" style={{ gap: 10 }}>
          <h2 className="t-over set-sec">{t("invoices")}</h2>
          <div className="set">
            {s.receipts.length ? s.receipts.map((r) => (
              <div key={r.id} className="inv-row">
                <span className="ph ph-receipt" style={{ fontSize: 22, color: "var(--ink-2)" }} aria-hidden="true" />
                <span className="grow">{r.date}<small>{r.what}</small></span>
                <span className="amt"><span className={r.mc}>{r.amt}</span></span>
                <span className={r.cls}>{r.st}</span>
                <Link href={`/app/settings/billing/receipt/${r.id}`} className="icon-btn plain" aria-label={r.aria} style={{ inlineSize: 44, blockSize: 44 }}><span className="ph ph-download" aria-hidden="true" /></Link>
              </div>
            )) : <p className="set-row t-small ink-2">{t("noInvoices")}</p>}
          </div>
          {s.refund || s.canCancel || v.requests.length ? (
            <div className="set">
              {s.refund?.kind === "open" ? <Link href="/app/settings/billing/refund" className="set-row"><span className="ph ph-refund" aria-hidden="true" /><span className="set-l">{t("askRefund")}<small>{s.refund.sub}</small></span><span className="ph ph-caret-end flip ink-3" aria-hidden="true" /></Link> : null}
              {s.refund?.kind === "asked" ? <Link href="/app/settings/billing/requests" className="set-row"><span className="ph ph-refund" aria-hidden="true" /><span className="set-l">{t("askRefund")}<small>{s.refund.sub}</small></span><span className="ph ph-caret-end flip ink-3" aria-hidden="true" /></Link> : null}
              {s.refund?.kind === "late" ? <RefundLate body={s.refund.body} cancelS={s.refund.cancelS} sub={s.refund.sub} initialOpen={sp.refund === "late"} /> : null}
              {v.requests.length && s.refund?.kind !== "asked" ? <Link href="/app/settings/billing/requests" className="set-row"><span className="ph ph-tray" aria-hidden="true" /><span className="set-l">{t("tRequests")}</span><span className="ph ph-caret-end flip ink-3" aria-hidden="true" /></Link> : null}
              {s.canCancel ? <Link href="/app/settings/billing/cancel" className="set-row"><span className="ph ph-x-circle" aria-hidden="true" /><span className="set-l">{t("cancelPlan")}<small>{t("cancelSub")}</small></span><span className="ph ph-caret-end flip ink-3" aria-hidden="true" /></Link> : null}
            </div>
          ) : null}
          <p className="pg-note" style={{ fontSize: 13 }}><span className="ph ph-info" aria-hidden="true" /><span>{t("billNote")}</span></p>
        </div>
      </div>
      <Toast text={toast} />
    </Shell>
  );
}
