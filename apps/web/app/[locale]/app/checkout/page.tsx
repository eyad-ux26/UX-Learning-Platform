import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { PayButton } from "@/components/billing/CheckoutView";
import { formatMoney, moneyCls } from "@/lib/billing/pricing";
import { requireLearner } from "@/lib/server/learner";
import { loadOffer } from "@/lib/server/billing/plans";
import { countryName } from "@/lib/server/billing/page";

export const dynamic = "force-dynamic";

/** Check and pay: the server-priced summary, who takes the payment, then the hand-off to their secure page. */
export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("billing");
  const offer = await loadOffer(me, { code: sp.code ?? null, fixtureOffer: sp.offer, fixtureCountry: sp.country });
  if (offer.pro && !offer.grace) return redirect({ href: "/app/settings/billing", locale }) as never;
  const period = sp.period === "month" ? "month" : "year";
  const q = period === "month" ? offer.month : offer.year;
  const $ = (n: number) => formatMoney(n, q.currency, locale as "en" | "ar");
  const prov = offer.provider;
  const then = q.discount === "founding" ? t("thenFy", { x: $(q.renewAmount) })
    : q.discount === "welcome_back" ? t("wbThen", { x: $(q.base) })
    : period === "month" ? t("thenM", { x: $(q.renewAmount) }) : t("thenY", { x: $(q.renewAmount) });
  const discLabel = q.discount === "founding" ? t("fdSum", { code: q.code ?? "" }) : q.discount === "welcome_back" ? t("wbSum") : q.discount === "student" ? t("stSum") : null;
  const methods = prov === "paymob"
    ? [["ph ph-credit-card", t("prov.paymob.m1")], ["ph ph-credit-card", t("prov.paymob.m2")], ["ph ph-wallet", t("prov.paymob.m3")]]
    : [["ph ph-credit-card", t("prov.paddle.m1")], ["ph ph-wallet", t("prov.paddle.m2")], ["ph ph-wallet", t("prov.paddle.m3")]];
  return (
    <div className="chk-page">
      <header className="secure-head">
        <Link href="/app/plans" className="icon-btn plain" aria-label={t("back")}><span className="ph ph-arrow back" aria-hidden="true" /></Link>
        <Logo height={28} />
        <div style={{ flex: 1 }} />
        <span className="lockline"><span className="ph ph-lock-fill" aria-hidden="true" />{t("secure")}</span>
      </header>
      <main className="chk">
        <h1 className="pg-title">{t("reviewTitle")}</h1>
        <div className="sum">
          <div className="sum-row"><span>{t("sumPlan")}</span><b>{t("proName")} · {period === "month" ? t("monthly") : t("annual")}</b></div>
          {discLabel ? <div className="sum-row"><span>{t("sumCode")}</span><b>{discLabel}</b></div> : null}
          <div className="sum-row total"><span>{t("sumToday")}</span><b><span className={moneyCls(q.currency)}>{$(q.amount)}</span></b></div>
          <div className="sum-row"><span>{t("sumThen")}</span><b>{then}</b></div>
          <div className="sum-row"><span>{t("sumCountry")}</span><b>{countryName(offer.country, locale)}</b></div>
        </div>
        <div className="prov">
          <span className="ph ph-shield-check" aria-hidden="true" />
          <span className="grow">
            <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b>{t(`prov.${prov}.t`)}</b><span className="prov-mark">{prov === "paymob" ? "Paymob" : "Paddle"}</span></span>
            <span>{t(`prov.${prov}.body`)}</span>
            <span className="methods" style={{ marginBlockStart: 4 }}>{methods.map(([icon, label]) => <span key={label} className="tag" style={{ background: "var(--surface)", color: "var(--ink)" }}><span className={icon} aria-hidden="true" />{label}</span>)}</span>
          </span>
        </div>
        <div className="facts">
          <p><span className="ph ph-sync" aria-hidden="true" /><span>{t(`prov.${prov}.f1`)}</span></p>
          <p><span className="ph ph-refund" aria-hidden="true" /><span>{t("refundFact")}</span></p>
        </div>
        {offer.mode === "mock" ? <p className="pg-note" style={{ fontSize: 13 }}><span className="ph ph-info" aria-hidden="true" /><span>{t("testMode")}</span></p> : null}
        <div style={{ flex: 1 }} />
        <PayButton label={t(`prov.${prov}.go`)} period={period} code={q.code} locale={locale as "en" | "ar"} disabled={offer.mode === "off" || !me.db} />
        <p className="t-small ink-3" style={{ textAlign: "center", fontSize: 12.5 }}>{t("agree")} <Link href="/terms" className="hit" style={{ fontWeight: 700 }}>{t("terms")}</Link></p>
      </main>
    </div>
  );
}
