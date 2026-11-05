// The Coming Soon page (canvas v70, docs/design/prelaunch/README.md): what UXGate is, the launch-notify form, what you'll
// get, the launch prices and the footer with the legal pages. No link leads to sign-in: the team opens /team, which asks
// for the team password first (lib/team-access.ts). Shared by /coming-soon and its
// confirmation link. Views: "public" (the form), "member" (signed in, not an admin), "confirmed" and "expired" (from the
// confirmation link). The prices are not on the canvas: Paddle's website review looks for them.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { LogoMotion } from "@/components/loading/LogoMotion";
import { WaitlistForm } from "./WaitlistForm";
import { SoonSignOut } from "./SoonSignOut";
import { PRICES, formatMoney, moneyCls, type Region } from "@/lib/billing/pricing";

export type SoonView = { kind: "public" } | { kind: "expired" } | { kind: "confirmed"; email: string } | { kind: "member"; email: string; name: string | null };

const TIERS: { region: Region; label: "tierEg" | "tierArab" | "tierWorld" }[] = [
  { region: "eg", label: "tierEg" }, { region: "arab", label: "tierArab" }, { region: "world", label: "tierWorld" },
];
const GET = [["ph-cursor", 1], ["ph-chat", 2], ["ph-seal", 3], ["ph-globe", 4]] as const;
const mail = (chunks: React.ReactNode) => <bdi className="soon-mail">{chunks}</bdi>;
/** Dollar amounts read left to right inside Arabic too ("$8"); pounds follow the page ("249 ج.م"). */
function money(currency: string) {
  return function Money(chunks: React.ReactNode) { return <bdi className={moneyCls(currency)}>{chunks}</bdi>; };
}

export async function ComingSoon({ locale, view }: { locale: string; view: SoonView }) {
  const t = await getTranslations("soon");
  const loc = locale === "ar" ? "ar" : "en";
  const chip = view.kind === "confirmed" ? { cls: "kind kind-free", icon: "ph-check-circle-fill", text: t("confChip") }
    : view.kind === "member" ? { cls: "kind kind-current", icon: "ph-user", text: t("memChip") }
    : { cls: "kind kind-soon", icon: "ph-hourglass", text: t("chip") };
  const title = view.kind === "confirmed" ? t("confT") : view.kind === "member" ? (view.name ? t("memT", { name: view.name }) : t("memTNoName")) : t("title");
  const initial = view.kind === "member" ? (view.name ?? view.email).trim().charAt(0).toUpperCase() : "";

  return (
    <div className="pg-soon">
      <header className="pub-nav">
        <Logo height={30} />
        <span style={{ flex: 1 }} />
        {view.kind === "member" ? (
          <span className="soon-who"><span className="avatar" aria-hidden="true" style={{ width: 32, height: 32, fontSize: 14 }}>{initial}</span><span className="ltr only-desk">{view.email}</span></span>
        ) : null}
        <LocaleSwitch />
      </header>

      <div className="soon-scroll">
        <main className="soon">
          <section className="soon-hero" aria-labelledby="soon-h1">
            <div className="soon-text">
              <span className={chip.cls}><span className={`ph ${chip.icon}`} aria-hidden="true" />{chip.text}</span>
              {view.kind === "public" || view.kind === "expired" ? <p className="t-over soon-over">{t("over")}</p> : null}
              <h1 id="soon-h1">{title}</h1>
              <p className="soon-lead">
                {view.kind === "confirmed" ? t.rich("confL", { email: view.email, mail }) : view.kind === "member" ? t("memL") : t("lead")}
              </p>
              {view.kind === "public" || view.kind === "expired" ? <WaitlistForm expired={view.kind === "expired"} /> : null}
              {view.kind === "member" ? (
                <div className="soon-done is-info" role="status">
                  <span className="soon-done-ic" aria-hidden="true"><span className="ph ph-bell" /></span>
                  <div className="soon-done-text">
                    <b>{t("memPT")}</b>
                    <p>{t.rich("memPB", { email: view.email, mail })}</p>
                    <SoonSignOut label={t("signOut")} />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="soon-art only-desk" aria-hidden="true">
              <div className="ug-loader-art">
                <span className="ug-loader-tag"><span className="ph ph-hash" />{t("artTag")}</span>
                <div className="ug-loader-frame sel-frame">
                  <LogoMotion size={112} />
                  <span className="ug-loader-line" />
                  <span className="ug-loader-line is-short" />
                  <span className="ug-loader-cursor"><span className="ph ph-cursor-fill" /></span>
                </div>
              </div>
            </div>
          </section>

          <section className="soon-get" aria-labelledby="soon-get">
            <h2 id="soon-get">{t("getTitle")}</h2>
            <ul>
              {GET.map(([icon, n]) => (
                <li key={n}><span className="soon-get-ic" aria-hidden="true"><span className={`ph ${icon}`} /></span><span className="soon-get-text"><b>{t(`get${n}t`)}</b><span>{t(`get${n}b`)}</span></span></li>
              ))}
            </ul>
          </section>

          <section className="soon-prices" aria-labelledby="soon-prices">
            <h2 id="soon-prices">{t("pricesTitle")}</h2>
            <p>{t("pricesLead")}</p>
            <ul>
              {TIERS.map(({ region, label }) => {
                const p = PRICES[region];
                return (
                  <li key={region}>
                    <span className="t-over">{t(label)}</span>
                    <b>{t.rich("perMonth", { amount: formatMoney(p.month, p.currency, loc), m: money(p.currency) })}</b>
                    <span>{t.rich("orYear", { amount: formatMoney(p.year, p.currency, loc), m: money(p.currency) })}</span>
                  </li>
                );
              })}
            </ul>
            <p className="soon-tax">{t("plusTax")}</p>
          </section>
        </main>

        <footer className="soon-foot">
          <span className="ltr">© 2026 UXGate</span>
          <nav aria-label={t("footNav")}>
            <Link href="/privacy">{t("privacy")}</Link>
            <Link href="/terms">{t("terms")}</Link>
            <Link href="/refund">{t("refund")}</Link>
            <a href="mailto:support@uxgate.org" className="ltr">support@uxgate.org</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
