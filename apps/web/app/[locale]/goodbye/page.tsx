/* eslint-disable @next/next/no-img-element */
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { BYE_COOKIE } from "@/lib/server/account";
import { deleteAfter, longDate } from "@/lib/reminder-plan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

/** After Delete my account: signed out, removal scheduled, and how to undo it. The same date is in the email. */
export default async function GoodbyePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("acctdata");
  let info: { d?: string; e?: string; n?: string } = {};
  try { info = JSON.parse((await cookies()).get(BYE_COOKIE)?.value ?? "{}"); } catch { /* no cookie: show the general page */ }
  const date = longDate(info.d ? new Date(info.d) : deleteAfter(new Date()), locale as "en" | "ar");
  return (
    <div className="s4-pub">
      <header className="pub-head">
        <Logo height={30} />
        <LocaleSwitch />
      </header>
      <main className="bye">
        <img src="/ill/uxgate-ill-gate.png" alt="" width={104} height={104} />
        <h1>{t("byeTitle")}</h1>
        <p>{info.n ? t("byeBodyName", { name: info.n }) : t("byeBody")}</p>
        <section className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="why-row is-done" style={{ border: 0, padding: 0, minBlockSize: 0 }}><span className="ph ph-signout" aria-hidden="true" /><span className="grow"><b>{t("byeOut")}</b><span>{t("byeOutBody")}</span></span></div>
          {info.e ? <div className="why-row is-done" style={{ border: 0, padding: 0, minBlockSize: 0 }}><span className="ph ph-mail" aria-hidden="true" /><span className="grow"><b>{t("byeMail")}</b><span className="ltr" style={{ textAlign: "start" }}>{info.e}</span></span></div> : null}
          <div className="why-row" style={{ border: 0, padding: 0, minBlockSize: 0 }}><span className="ph ph-calendar" style={{ color: "var(--link)" }} aria-hidden="true" /><span className="grow"><b>{t("byeWhen", { date })}</b><span>{t("byeWhenBody")}</span></span></div>
        </section>
        <p className="t-small" style={{ fontSize: 14 }}><b>{t("byeUndoT")}</b> {t("byeUndo", { date })}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, inlineSize: "100%", maxInlineSize: 340 }}>
          <Link href="/signin" className="btn btn-secondary btn-block press">{t("signInKeep")}</Link>
          <Link href="/" className="btn btn-ghost btn-block">{t("toSite")}</Link>
        </div>
      </main>
    </div>
  );
}
