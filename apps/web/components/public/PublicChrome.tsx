// Header and footer of the public pages (path pages, privacy, terms) and the minimal header of the system pages.
// No "use client": they render on the server in public pages, and inside the client error boundary too.
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/Logo";

export function PubHeader({ current }: { current?: "paths" }) {
  const t = useTranslations("pathpage");
  const links = [
    { id: "paths", href: "/paths", label: t("navPaths") },
    { id: "how", href: "/#how", label: t("navHow") },
    { id: "pricing", href: "/#plan", label: t("navPricing") },
    { id: "faq", href: "/#faq", label: t("navFaq") },
  ];
  return (
    <header className="pub-nav">
      <Link href="/" className="pub-logo" aria-label="UXGate"><Logo height={26} /></Link>
      <nav className="links pub-only-desk" aria-label={t("siteNav")}>
        {links.map((l) => (
          <Link key={l.id} href={l.href} className={l.id === current ? "is-on" : undefined} aria-current={l.id === current ? "page" : undefined}>{l.label}</Link>
        ))}
      </nav>
      <span className="pub-grow" />
      <LocaleSwitch />
      <Link href="/signin" className="btn btn-neutral btn-sm pub-only-desk">{t("signin")}</Link>
      <Link href="/try" className="btn btn-primary btn-sm press pub-nav-cta">
        <span className="pub-only-desk">{t("tryLesson")}</span><span className="pub-only-mob">{t("tryShort")}</span>
      </Link>
    </header>
  );
}

/** System and error pages keep only the logo and the language switch. */
export function SysHeader() {
  return (
    <header className="pub-nav">
      <Link href="/" className="pub-logo" aria-label="UXGate"><Logo height={26} /></Link>
      <span className="pub-grow" />
      <LocaleSwitch />
    </header>
  );
}

export function PubFooter() {
  const t = useTranslations("pathpage");
  return (
    <footer className="pub-foot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-white.svg" alt="UXGate" className="pub-foot-logo" width={109} height={28} />
      <span className="pub-grow" />
      <nav aria-label={t("footNav")}>
        <Link href="/paths">{t("footPaths")}</Link>
        <Link href="/#plan">{t("footPricing")}</Link>
        <Link href="/#faq">{t("footHelp")}</Link>
        <Link href="/terms">{t("footTerms")}</Link>
        <Link href="/privacy">{t("footPrivacy")}</Link>
      </nav>
      <a href="mailto:support@uxgate.org" className="mail ltr">support@uxgate.org</a>
    </footer>
  );
}
