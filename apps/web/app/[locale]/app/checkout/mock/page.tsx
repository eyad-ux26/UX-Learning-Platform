import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { MockPay } from "@/components/billing/MockPay";
import { formatMoney, moneyCls } from "@/lib/billing/pricing";
import { requireLearner } from "@/lib/server/learner";
import { mockAllowed } from "@/lib/server/billing/config";
import { requestHost } from "@/lib/server/billing/account";

export const dynamic = "force-dynamic";

/** The test-mode payment page. It exists only on test hosts with BILLING_MOCK=1, never on the live site. */
export default async function MockCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  if (!mockAllowed(await requestHost())) notFound();
  const me = await requireLearner(locale);
  const t = await getTranslations("billing");
  const id = sp.session && /^[0-9a-f-]{36}$/i.test(sp.session) ? sp.session : null;
  if (!id || !me.db) notFound();
  const { data } = await me.db
    .from("checkout_sessions")
    .select("id, provider, status, amount_minor, currency, period")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.provider !== "mock") notFound();
  return (
    <div className="chk-page">
      <header className="secure-head">
        <Logo height={28} />
        <div style={{ flex: 1 }} />
        <span className="lockline">
          <span className="ph ph-lock-fill" aria-hidden="true" />
          {t("secure")}
        </span>
      </header>
      <main className="chk">
        <h1 className="pg-title">{t("mock.title")}</h1>
        <p className="pg-note">
          <span className="ph ph-info" aria-hidden="true" />
          <span>{t("mock.lead")}</span>
        </p>
        <div className="sum">
          <div className="sum-row">
            <span>{t("sumPlan")}</span>
            <b>
              {t("proName")} · {data.period === "month" ? t("monthly") : t("annual")}
            </b>
          </div>
          <div className="sum-row total">
            <span>{t("mock.amount")}</span>
            <b>
              <span className={moneyCls(data.currency)}>
                {formatMoney(data.amount_minor, data.currency, locale as "en" | "ar")}
              </span>
            </b>
          </div>
        </div>
        <MockPay sessionId={data.id} pending={data.status === "pending"} />
      </main>
    </div>
  );
}
