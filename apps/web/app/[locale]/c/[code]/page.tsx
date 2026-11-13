import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { CertArt } from "@/components/app/CertArt";
import { Link } from "@/i18n/navigation";
import { localPathName } from "@/lib/catalog";
import { certStats } from "@/lib/certificate-stats";
import { certId, ogUrl, publicUrl } from "@/lib/certificate-share";
import { requestOrigin } from "@/lib/server/origin";
import { publicCertificate, revokedCertificate } from "@/lib/server/certificates";

// Read on every request: turning the certificate page off must take it down at once, so nothing here may be cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const originOf = requestOrigin;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; code: string }> }): Promise<Metadata> {
  const { locale, code } = await params;
  const c = await publicCertificate(code);
  if (!c && (locale === "en" || locale === "ar") && (await revokedCertificate(code))) {
    const t = await getTranslations({ locale, namespace: "cert" });
    return { title: t("revokedMeta"), robots: { index: false, follow: false } };
  }
  if (!c || (locale !== "en" && locale !== "ar")) return { title: "UXGate", robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: "cert" });
  const origin = await originOf();
  const pathName = localPathName(c.pathId, locale);
  const title = t("ogTitle", { name: c.name, path: pathName });
  const image = ogUrl(origin, locale, c.code, c.changedAt);
  return {
    title, description: t("how", { count: certStats(c.pathId).checks }), robots: { index: false, follow: false },
    openGraph: { type: "website", title, description: t("how", { count: certStats(c.pathId).checks }), url: publicUrl(origin, locale, c.code), siteName: "UXGate", images: [{ url: image, width: 1200, height: 628 }] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

/** The public certificate page: name, path, skill count, date and code, nothing else. A 404 until the learner turns it on. */
export default async function PublicCertificate({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const c = await publicCertificate(code);
  if (!c && (locale === "en" || locale === "ar")) {
    const r = await revokedCertificate(code);
    if (r) return <Revoked r={r} locale={locale} />;
  }
  if (!c || (locale !== "en" && locale !== "ar")) notFound();
  const t = await getTranslations("cert");
  const pathName = localPathName(c.pathId, locale);
  const s = certStats(c.pathId);
  const issued = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(c.issuedAt));
  const art = { name: c.name, pathName, shown: s.skills, checks: s.checks, lessons: s.lessons, issued, code: c.code, pathId: c.pathId, locale } as const;
  const facts: [string, string, boolean?][] = [
    [t("fIssuedTo"), c.name], [t("fPath"), pathName], [t("fSkills"), t("fSkillsOf", { shown: s.skills, total: s.skills })], [t("fIssued"), issued], [t("fId"), certId(c.pathId, c.code), true],
  ];
  return (
    <div className="cxv-page">
      <header className="cxv-topbar"><Logo height={30} /><Link href={`/c/${c.code}`} locale={locale === "ar" ? "en" : "ar"} className="btn btn-ghost btn-sm">{t("other")}</Link></header>
      <main className="cxv-main">
        <div className="cxv-wrap">
          <p className="cxv-ok"><span className="ph ph-seal-check-fill" aria-hidden="true" />{t("verified")}</p>
          <h1 className="t-h1 cxv-h1"><bdi>{t("pubTitle", { name: c.name, path: pathName })}</bdi></h1>
          <CertArt d={art} size="public" />
          <div className="cxv-grid">
            <dl className="cxv-facts">{facts.map(([k, v, ltr]) => <div key={k}><dt>{k}</dt><dd className={ltr ? "ltr" : undefined}><bdi>{v}</bdi></dd></div>)}</dl>
            <section className="cxv-mean">
              <h2>{t("meanTitle")}</h2>
              <p>{t("mean")}</p>
              <Link href="/" className="btn btn-primary btn-lg press">{t("cta")}</Link>
              <p className="t-small">{t("ctaSub")}</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/** CRT-2: a revoked certificate says so, with the team's reason in the page's language, and shows nothing else. */
async function Revoked({ r, locale }: { r: Awaited<ReturnType<typeof revokedCertificate>> & object; locale: "en" | "ar" }) {
  const t = await getTranslations("cert");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(r.revokedAt));
  const reason = r.reason?.[locale] || r.reason?.en || r.reason?.ar || "";
  return (
    <div className="cxv-page">
      <header className="cxv-topbar"><Logo height={30} /><Link href={`/c/${r.code}`} locale={locale === "ar" ? "en" : "ar"} className="btn btn-ghost btn-sm">{t("other")}</Link></header>
      <main className="cxv-main">
        <div className="cxv-wrap">
          <p className="cxv-ok" style={{ color: "var(--bad-ink, #B4233A)" }}><span className="ph ph-warning-circle" aria-hidden="true" />{t("revokedTitle")}</p>
          <h1 className="t-h1 cxv-h1">{t("revokedTitle")}</h1>
          <p><bdi>{t("revokedBody", { id: certId(r.pathId, r.code), date })}</bdi></p>
          {reason ? <p><bdi>{t("revokedReason", { reason })}</bdi></p> : null}
          <p className="t-small">{t("revokedHelp")}</p>
        </div>
      </main>
    </div>
  );
}
