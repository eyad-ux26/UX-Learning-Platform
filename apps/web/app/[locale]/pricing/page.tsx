import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PubFooter, PubHeader } from "@/components/public/PublicChrome";
import { DISCOUNTS, PRICES, formatMoney, yearlySaving } from "@/lib/billing/pricing";
import { SITE_URL, pageAlternates } from "@/lib/public-paths";

export const dynamic = "force-static";
export const revalidate = false;

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricingPage" });
  return { metadataBase: new URL(SITE_URL), title: t("metaTitle"), description: t("metaDesc"), alternates: pageAlternates(locale, "/pricing") };
}

/**
 * The public pricing page (Paddle's website review reads it): the international prices Paddle sells, what each plan includes,
 * the billing period, and the legal links. Open past the Coming Soon gate (lib/coming-soon.ts). Same price table as the app.
 */
export default async function PricingPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricingPage");
  const L = locale as Locale;
  const w = PRICES.world;
  const $ = (n: number) => formatMoney(n, w.currency, L);
  const link = (href: "/terms" | "/privacy" | "/refund") => (c: React.ReactNode) => <Link href={href} className="pub-link">{c}</Link>;
  return (
    <div className="s4-pub">
      <PubHeader />
      <main className="legal">
        <div className="pg-stack">
          <div className="legal-head"><h1>{t("title")}</h1></div>
          <p>{t("lead")}</p>
          <div className="doc" style={{ display: "grid", gap: 16 }}>
            <section className="card" aria-labelledby="pr-free" style={{ padding: 20 }}>
              <h2 id="pr-free">{t("freeName")}</h2>
              <p><b className="num ltr">{t("freePrice")}</b> · {t("freeNote")}</p>
              <ul><li>{t("free1")}</li><li>{t("free2")}</li></ul>
            </section>
            <section className="card" aria-labelledby="pr-pro" style={{ padding: 20 }}>
              <h2 id="pr-pro">{t("proName")}</h2>
              <ul><li>{t("pro1")}</li><li>{t("pro2")}</li><li>{t("pro3")}</li></ul>
              <p><b>{t("monthly")}</b>: <b className="num ltr">{$(w.month)}</b> {t("perMonth")}</p>
              <p><b>{t("yearly")}</b>: <b className="num ltr">{$(w.year)}</b> {t("perYear")} · {t.rich("save", { amount: $(yearlySaving("world")), m: (c) => <span className="ltr">{c}</span> })}</p>
            </section>
            <p>{t("notes", { percent: DISCOUNTS.student.percent })}</p>
            <p>{t.rich("policies", { terms: link("/terms"), privacy: link("/privacy"), refund: link("/refund") })}</p>
            <p>{t.rich("questions", { mail: (c) => <a href="mailto:support@uxgate.org" className="ltr pub-link">{c}</a> })}</p>
          </div>
        </div>
      </main>
      <PubFooter />
    </div>
  );
}
