import { PathName } from "@/components/PathName";
import { localPathName } from "@/lib/catalog-list";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthErrorRedirect } from "@/components/AuthErrorRedirect";
import { LandingPreview } from "@/components/LandingPreview";
import { Faq } from "@/components/Faq";
import { Logo } from "@/components/Logo";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { Link } from "@/i18n/navigation";

export default async function Landing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  const how = [
    { icon: "ph-cursor", t: t("how1t"), b: t("how1b") },
    { icon: "ph-chat", t: t("how2t"), b: t("how2b") },
    { icon: "ph-seal", t: t("how3t"), b: t("how3b") },
  ];
  const paths = [
    { slug: "forms-that-flow", id: "P01", sub: t("forms"), img: "path-forms", isNew: true },
    { slug: "visual-hierarchy-in-action", id: "P10", sub: t("hier"), img: "path-hierarchy", isNew: false },
    { slug: "find-and-fix-usability", id: "P02", sub: t("usab"), img: "path-usability", isNew: false },
  ];

  return (
    <div className="landing">
      <AuthErrorRedirect />
      <header className="land-head">
        <Logo height={28} />
        <nav className="land-nav" aria-label="UXGate">
          <Link href="/paths">{t("navPaths")}</Link>
          <a href="#how">{t("navHow")}</a>
          <a href="#plan">{t("navPricing")}</a>
          <a href="#faq">{t("navFaq")}</a>
        </nav>
        <span className="grow" />
        <LocaleSwitch />
        <Link href="/signin" className="btn btn-neutral btn-sm">{t("signin")}</Link>
        <Link href="/signup" className="btn btn-primary btn-sm land-try">{t("try")}</Link>
      </header>

      <main>
        <section className="land-hero">
          <div className="hero-copy">
            <span className="pill pill-soft"><span className="ph ph-sparkle" aria-hidden="true" />{t("over")}</span>
            <h1 className="t-display hero-title">{t("headline")}</h1>
            <p className="t-lead">{t("lead")}</p>
            <div className="hero-cta">
              <Link href="/signup" className="btn btn-primary btn-lg press"><span className="ph ph-play" aria-hidden="true" />{t("try")}</Link>
              <Link href="/paths" className="btn btn-secondary btn-lg press">{t("seePaths")}</Link>
            </div>
            <p className="t-small ink-2 hero-note"><span className="ph ph-clock" aria-hidden="true" />{t("note")}</p>
          </div>
          <div className="hero-preview">
            <span className="hero-label" aria-hidden="true"><span className="ph ph-frame-corners" />{t("previewLabel")}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ill/uxgate-ill-gate.png" alt="" className="hero-ill" width={112} height={112} />
            <div className="hero-mock" aria-hidden="true">
              <div className="mock-bar"><span className="lbl">{t("mockChip")}</span><span className="cap">{t("mockCap")}</span><span className="dots"><i /><i /></span></div>
              <div className="hm-body">
                <p className="hm-brand"><span className="hm-logo">H</span>{t("gymName")}</p>
                <p className="hm-title">{t("gymJoin")}</p>
                {[t("gymFull"), t("gymEmail"), t("gymPhone"), t("gymFax")].map((x) => <span key={x} className="hm-field"><i>{x}</i></span>)}
                <span className="hm-btn">{t("gymBtn")}</span>
              </div>
            </div>
            <LandingPreview />
          </div>
        </section>

        <section id="how" className="land-sec">
          <h2 className="t-h2">{t("howTitle")}</h2>
          <div className="how-grid">
            {how.map((h, n) => (
              <div key={h.t} className="how-item">
                <p className="how-step"><span className="ph ph-frame-corners" aria-hidden="true" />{t("step", { n: n + 1 })}</p>
                <div className="card how-card">
                  <span className="how-icon"><span className={`ph ${h.icon}`} aria-hidden="true" /></span>
                  <div><p className="t-label how-t">{h.t}</p><p className="t-small ink-2">{h.b}</p></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="paths" className="land-sec">
          <h2 className="t-h2">{t("pathsTitle")}</h2>
          <div className="paths-grid">
            {paths.map((p) => (
              <Link key={p.id} href={`/paths/${p.slug}`} className="card press path-card">
                <span className="path-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/ill/uxgate-ill-${p.img}.png`} alt="" width={84} height={84} />
                </span>
                <span className="path-body">
                  <span className="t-label path-name"><PathName name={localPathName(p.id, locale)} /></span>
                  <span className="t-small ink-2">{p.sub}</span>
                  <span className="path-tags"><span className="tag">{t("units")}</span><span className="tag tag-free">{t("unitFree")}</span></span>
                </span>
                {p.isNew ? <span className="path-pill" aria-hidden="true">{t("isNew")}</span> : null}
                {p.isNew ? <span className="sticker path-new"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6 L67.6 27.7 L93.7 37.8 L78.5 61.3 L77 89.2 L50 82 L23 89.2 L21.5 61.3 L6.3 37.8 L32.4 27.7 Z" strokeWidth="10" strokeLinejoin="round" /></svg><span>{t("isNew")}</span></span> : null}
              </Link>
            ))}
          </div>
          <p className="t-small ink-2 paths-note">{t("pathsNote")} <Link href="/paths" className="hit">{t("seePaths")}</Link></p>
        </section>

        <section id="plan" className="land-sec">
          <div className="plan-grid">
            <div className="card free-card">
              <p className="t-over">{t("freeOver")}</p>
              <p className="free-amount num">{t("freeAmount")}</p>
              <ul className="free-list">
                {[t("free1"), t("free2")].map((x) => <li key={x}><span className="ph ph-check-circle-fill" aria-hidden="true" />{x}</li>)}
              </ul>
              <Link href="/signup" className="btn btn-secondary btn-block press">{t("try")}</Link>
            </div>
            <div className="plan-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ill/uxgate-ill-key.png" alt="" className="plan-art" width={120} height={120} />
              <p className="plan-over">{t("planOver")}</p>
              <h2 className="t-h2 plan-title">{t("planTitle")}</h2>
              <p className="plan-price"><span className="plan-amount ltr">[PRICE]</span><span className="plan-per">{t("perMonth")}</span></p>
              <ul className="plan-list">
                {[t("plan1"), t("plan2"), t("plan3")].map((x) => <li key={x}><span className="ph ph-check-circle-fill" aria-hidden="true" />{x}</li>)}
              </ul>
              <Link href="/signup" className="btn btn-highlight btn-block press"><span className="plan-cta-m">{t("try")}</span><span className="plan-cta-d">{t("startSub")}</span></Link>
            </div>
          </div>
        </section>

        <section id="faq" className="land-sec faq-sec">
          <div className="faq-side">
            <h2 className="t-h2">{t("faqTitle")}</h2>
            <a href="mailto:support@uxgate.org" className="help-link"><span className="ph ph-chat" aria-hidden="true" />{t("help")}</a>
          </div>
          <div className="faq-main">
            <Faq items={[{ q: t("q1"), a: t("a1") }, { q: t("q4"), a: t("a4") }, { q: t("q2"), a: t("a2") }, { q: t("q3"), a: t("a3") }, { q: t("q5"), a: t("a5") }]} />
            <div className="card-mint help-card">
              <span className="help-icon"><span className="ph ph-chat" aria-hidden="true" /></span>
              <div><p className="t-label">{t("help")}</p><a href="mailto:support@uxgate.org" className="t-small ltr help-mail hit">support@uxgate.org</a></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="land-foot">
        <Logo height={20} />
        <nav className="land-foot-links" aria-label={t("navPaths")}>
          <Link href="/paths">{t("navPaths")}</Link>
          <a href="#plan">{t("navPricing")}</a>
        </nav>
        <ThemeSwitch />
        <span className="land-domain t-small ltr"><span className="ph ph-globe" aria-hidden="true" /><span><span className="only-mobile">www.</span>uxgate.org</span></span>
      </footer>
    </div>
  );
}
