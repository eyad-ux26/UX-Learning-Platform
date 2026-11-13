import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PathCard } from "@/components/public/PathCard";
import { PubFooter, PubHeader } from "@/components/public/PublicChrome";
import { SITE_URL, isOpen, pageAlternates, publicPathsInOrder } from "@/lib/public-paths";

export const dynamic = "force-static";
export const revalidate = false;

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pathpage" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("metaIndex"),
    description: t("indexLead"),
    alternates: pageAlternates(locale, "/paths"),
  };
}

/** Every path, open ones first, each linking to its public page. */
export default async function PathsIndex({ params }: Params) {
  const { locale: l } = await params;
  setRequestLocale(l);
  const locale = l as Locale;
  const t = await getTranslations("pathpage");
  const all = publicPathsInOrder();
  const open = all.filter((p) => isOpen(p));
  const soon = all.filter((p) => !isOpen(p));
  return (
    <div className="s4-pub">
      <PubHeader current="paths" />
      <main className="pub-main">
        <section className="pp-hero">
          <div className="pub-stack">
            <h1>{t("indexTitle")}</h1>
            <p className="lead">{t("indexLead")}</p>
          </div>
        </section>
        <section className="pp-sec" aria-labelledby="px-open">
          <h2 id="px-open">{t("indexOpen")}</h2>
          <ul className="pg-grid pub-list pub-grid">
            {open.map((p) => (
              <li key={p.id}>
                <PathCard p={p} locale={locale} open />
              </li>
            ))}
          </ul>
        </section>
        <section className="pp-sec" aria-labelledby="px-soon">
          <h2 id="px-soon">{t("indexSoon")}</h2>
          <ul className="pg-grid pub-list pub-grid">
            {soon.map((p) => (
              <li key={p.id}>
                <PathCard p={p} locale={locale} open={false} />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <PubFooter />
    </div>
  );
}
