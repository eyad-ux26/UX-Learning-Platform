import { getTranslations, setRequestLocale } from "next-intl/server";
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
    { name: "Forms That Flow", sub: t("forms"), img: "path-forms", isNew: true },
    { name: "Visual Hierarchy in Action", sub: t("hier"), img: "path-hierarchy", isNew: false },
    { name: "Find and Fix Usability", sub: t("usab"), img: "path-usability", isNew: false },
  ];

  return (
    <div className="landing">
      <header className="land-head">
        <Logo height={28} />
        <nav className="land-nav" aria-label="UXGate">
          <a href="#how">{t("navHow")}</a>
          <a href="#paths">{t("navPaths")}</a>
          <a href="#plan">{t("navPricing")}</a>
          <a href="#faq">{t("navFaq")}</a>
        </nav>
        <span className="grow" />
        <LocaleSwitch />
        <Link href="/signin" className="btn btn-ghost btn-sm">{t("signin")}</Link>
      </header>

      <main>
        <section className="land-hero">
          <div className="hero-copy">
            <span className="pill pill-soft"><span className="ph ph-sparkle" aria-hidden="true" />{t("over")}</span>
            <h1 className="t-display hero-title">{t("headline")}</h1>
            <p className="t-lead">{t("lead")}</p>
            <div className="hero-cta">
              <Link href="/signup" className="btn btn-primary btn-lg press"><span className="ph ph-play" aria-hidden="true" />{t("try")}</Link>
              <a href="#paths" className="btn btn-secondary btn-lg press">{t("seePaths")}</a>
            </div>
            <p className="t-small ink-2 hero-note"><span className="ph ph-clock" aria-hidden="true" />{t("note")}</p>
          </div>
          <div className="hero-preview" role="img" aria-label={t("previewLabel")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ill/uxgate-ill-bulb.png" alt="" className="hero-ill" width={112} height={112} />
            <div className="card preview-card" aria-hidden="true">
              <div className="preview-top"><div className="progress progress-sm"><i style={{ width: "40%" }} /></div><span className="t-small num ink-3">4/10</span></div>
              <p className="t-over" style={{ color: "var(--link)" }}>{t("pOver")}</p>
              <p className="t-label preview-q">{t("pQ")}</p>
              <span className="choice"><span className="key">{locale === "ar" ? "ب" : "B"}</span><span className="grow">{t("optB")}</span></span>
              <span className="choice is-selected"><span className="key">{locale === "ar" ? "ج" : "C"}</span><span className="grow">{t("optC")}</span></span>
              <span className="btn btn-primary btn-block">{t("check")}</span>
            </div>
            <span className="pill pop preview-xp"><span className="ph ph-bolt-fill" aria-hidden="true" /><span className="num ltr">+10 XP</span></span>
          </div>
        </section>

        <section id="how" className="land-sec">
          <h2 className="t-h2">{t("howTitle")}</h2>
          <div className="how-grid">
            {how.map((h) => (
              <div key={h.t} className="card how-card">
                <span className="how-icon"><span className={`ph ${h.icon}`} aria-hidden="true" /></span>
                <div><p className="t-label how-t">{h.t}</p><p className="t-small ink-2">{h.b}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="paths" className="land-sec">
          <h2 className="t-h2">{t("pathsTitle")}</h2>
          <div className="paths-grid">
            {paths.map((p) => (
              <Link key={p.name} href="/signup" className="card press path-card">
                <span className="path-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/ill/uxgate-ill-${p.img}.png`} alt="" width={84} height={84} />
                </span>
                <span className="path-body">
                  <span className="t-label ltr path-name">{p.name}</span>
                  <span className="t-small ink-2">{p.sub}</span>
                  <span className="path-tags"><span className="tag">{t("units")}</span><span className="tag tag-free">{t("unitFree")}</span></span>
                </span>
                {p.isNew ? <span className="sticker path-new"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6 L67.6 27.7 L93.7 37.8 L78.5 61.3 L77 89.2 L50 82 L23 89.2 L21.5 61.3 L6.3 37.8 L32.4 27.7 Z" strokeWidth="10" strokeLinejoin="round" /></svg><span>{t("isNew")}</span></span> : null}
              </Link>
            ))}
          </div>
          <p className="t-small ink-2 paths-note">{t("pathsNote")}</p>
        </section>

        <section id="plan" className="land-sec">
          <div className="plan-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ill/uxgate-ill-key.png" alt="" className="plan-art" width={120} height={120} />
            <p className="plan-over">{t("planOver")}</p>
            <h2 className="t-h2 plan-title">{t("planTitle")}</h2>
            <p className="plan-price"><span className="plan-amount ltr">[PRICE]</span><span className="plan-per">{t("perMonth")}</span></p>
            <ul className="plan-list">
              {[t("plan1"), t("plan2"), t("plan3")].map((x) => <li key={x}><span className="ph ph-check-circle-fill" aria-hidden="true" />{x}</li>)}
            </ul>
            <Link href="/signup" className="btn btn-highlight btn-block press">{t("try")}</Link>
          </div>
        </section>

        <section id="faq" className="land-sec">
          <h2 className="t-h2">{t("faqTitle")}</h2>
          <Faq items={[{ q: t("q1"), a: t("a1") }, { q: t("q2"), a: t("a2") }, { q: t("q3"), a: t("a3") }]} />
          <div className="card-mint help-card">
            <span className="help-icon"><span className="ph ph-chat" aria-hidden="true" /></span>
            <div><p className="t-label">{t("help")}</p><a href="mailto:support@uxgate.org" className="t-small ltr help-mail">support@uxgate.org</a></div>
          </div>
        </section>
      </main>

      <footer className="land-foot">
        <Logo height={22} />
        <ThemeSwitch />
        <span className="t-small ink-2 ltr">www.uxgate.org</span>
      </footer>
    </div>
  );
}
