// The Coming Soon page (canvas v70, docs/design/prelaunch/README.md): what UXGate is, the launch-notify form, what you'll
// get and the footer with the legal pages. No link leads to sign-in: the team opens /team, which asks
// for the team password first (lib/team-access.ts). Shared by /coming-soon and its
// confirmation link. Views: "public" (the form), "member" (signed in, not an admin), "confirmed" and "expired" (from the
// confirmation link).
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { LogoMotion } from "@/components/loading/LogoMotion";
import { WaitlistForm } from "./WaitlistForm";
import { SoonSignOut } from "./SoonSignOut";

export type SoonView = { kind: "public" } | { kind: "expired" } | { kind: "confirmed"; email: string } | { kind: "member"; email: string; name: string | null };

const GET = [["ph-cursor", 1], ["ph-chat", 2], ["ph-seal", 3], ["ph-globe", 4]] as const;
const mail = (chunks: React.ReactNode) => <bdi className="soon-mail">{chunks}</bdi>;
export async function ComingSoon({ view }: { locale?: string; view: SoonView }) {
  const t = await getTranslations("soon");
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
        </main>

        <footer className="soon-foot">
          <span className="ltr">© 2026 UXGate</span>
          <nav aria-label={t("footNav")}>
            <Link href="/pricing">{t("pricing")}</Link>
            <Link href="/privacy">{t("privacy")}</Link>
            <Link href="/terms">{t("terms")}</Link>
            <Link href="/refund">{t("refund")}</Link>
            <a href="mailto:support@uxgate.org">{t("contact")}</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
