import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PubFooter, PubHeader } from "@/components/public/PublicChrome";
import { LEGAL, LEGAL_STATUS, type LegalKind } from "@/lib/legal-text";
import { SITE_URL, pageAlternates } from "@/lib/public-paths";

export async function legalMetadata(kind: LegalKind, locale: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "legal" });
  const doc = LEGAL[kind][locale as Locale];
  return {
    metadataBase: new URL(SITE_URL),
    title: `${doc.title} · UXGate`,
    description: t(kind === "privacy" ? "privacyDesc" : "termsDesc"),
    alternates: pageAlternates(locale, `/${kind}`),
    // The sample draft stays out of search results until the admins approve the text.
    robots: LEGAL_STATUS.approved ? undefined : { index: false, follow: true },
  };
}

/** Privacy and terms: a reading page. On phones the table of contents folds into a button (a native <details>, no script);
 *  on desktop it is a side list. */
export async function LegalPage({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const t = await getTranslations("legal");
  const doc = LEGAL[kind][locale];
  const other: Locale = locale === "ar" ? "en" : "ar";
  const toc = doc.sections.map((s, i) => (
    <a key={s.h} href={`#s${i + 1}`}><span className="n">{i + 1}</span>{s.h}</a>
  ));
  return (
    <div className="s4-pub">
      <PubHeader />
      <main className="legal">
        <div className="pg-stack pub-legal-side">
          {!LEGAL_STATUS.approved ? (
            <p className="sample-cap"><span>{t("sampleBadge")}</span>{t("sampleCap")}</p>
          ) : null}
          <div className="legal-head">
            <h1>{doc.title}</h1>
            <p className="legal-meta">
              <span>{t("updated")} {LEGAL_STATUS.updated}</span>
              <Link href={`/${kind}`} locale={other} hrefLang={other} lang={other} className="pub-link">{t("readOther")}</Link>
            </p>
          </div>
          <details className="pub-toc-fold pub-only-mob-block">
            <summary className="toc-btn"><span className="ph ph-list" aria-hidden="true" /><span className="grow">{t("onPage")}</span><span className="ph ph-caret pub-toc-caret" aria-hidden="true" /></summary>
            <nav className="toc" aria-label={t("onPage")}>{toc}</nav>
          </details>
          <nav className="toc pub-only-desk-block" aria-label={t("onPage")}>
            <p className="t-over">{t("onPage")}</p>
            {toc}
          </nav>
          <p className="pg-note pub-only-desk pub-qs"><span className="ph ph-mail" aria-hidden="true" /><span>{t("qs")} <a href="mailto:support@uxgate.org" className="ltr pub-link">support@uxgate.org</a></span></p>
        </div>
        <article className="doc">
          {doc.sections.map((s, i) => (
            <section key={s.h} aria-labelledby={`s${i + 1}`}>
              <h2 id={`s${i + 1}`}>{i + 1}. {s.h}</h2>
              {s.ps.map((x) => <p key={x}>{x}</p>)}
              {s.list ? <ul>{s.list.map((x) => <li key={x}>{x}</li>)}</ul> : null}
              {s.key ? <p className="key">{s.key}</p> : null}
            </section>
          ))}
        </article>
      </main>
      <PubFooter />
    </div>
  );
}
