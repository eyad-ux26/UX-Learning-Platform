"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { discounted, formatMoney, moneyCls, type Period } from "@/lib/billing/pricing";
import { isStudentEmail } from "@/lib/billing/student";
import type { Offer } from "@/lib/server/billing/plans";
import { billingPost } from "./api";
import { Sheet } from "./Sheet";

type Props = { offer: Offer; locale: "en" | "ar"; countries: { code: string; name: string }[]; countryName: string; fixture: boolean; studentDate: string | null };

const FP = [["unit1", true], ["review", true], ["streak", true], ["units", false], ["certs", false]] as const;

export function PlansView({ offer, locale, countries, countryName, fixture, studentDate }: Props) {
  const t = useTranslations("billing");
  const router = useRouter();
  const pathname = usePathname();
  const [period, setPeriod] = useState<Period>("year");
  const [codeOpen, setCodeOpen] = useState(!!offer.codeError);
  const [code, setCode] = useState(offer.code ?? "");
  const [sheet, setSheet] = useState<"country" | "student" | null>(null);
  const $ = (n: number) => formatMoney(n, offer.month.currency, locale);
  const mc = moneyCls(offer.month.currency);
  const q = period === "month" ? offer.month : offer.year;
  const closed = offer.mode === "off";
  const blocked = offer.pro && !offer.grace;

  const applyCode = () => {
    const c = code.trim().toUpperCase();
    router.replace(c ? `${pathname}?code=${encodeURIComponent(c)}` : pathname, { scroll: false });
  };

  // The discount the learner has now, shown once above the cards. Only one ever applies.
  const disc = offer.year.discount ?? offer.month.discount;
  const notice = disc === "founding" ? { icon: "ph ph-tag", t: t("fdT", { code: offer.year.code ?? "" }), b: t("fdBody", { x: $(offer.year.amount), y: $(offer.year.base) }), remove: true, sum: t("fdSum", { code: offer.year.code ?? "" }) }
    : disc === "welcome_back" ? { icon: "ph ph-sparkle", t: t("wbT"), b: t("wbBody", { x: $(offer.year.amount), y: $(offer.year.base) }), remove: false, sum: t("wbSum") }
    : disc === "student" ? { icon: "ph ph-student", t: t("stApplied"), b: t("stAppliedBody", { date: studentDate ?? "" }), remove: false, sum: t("stSum") }
    : null;

  const then = q.discount === "founding" ? t("thenFy", { x: $(q.renewAmount) })
    : q.discount === "welcome_back" ? t("wbThen", { x: $(q.base) })
    : period === "month" ? t("thenM", { x: $(q.renewAmount) }) : t("thenY", { x: $(q.renewAmount) });
  const selName = `${t("proName")} · ${period === "month" ? t("monthly") : t("annual")}`;
  const payHref = `/app/checkout?period=${period}${offer.code ? `&code=${encodeURIComponent(offer.code)}` : ""}`;

  const cards = (["month", "year"] as const).map((p) => {
    const pq = p === "month" ? offer.month : offer.year;
    const on = p === period;
    const sub = p === "month" ? t("monthlySub")
      : pq.discount === "founding" ? t("thenYear", { x: $(pq.renewAmount) })
      : pq.discount ? t("annualSub", { x: $(Math.round(pq.amount / 12)) })
      : t("annualSub", { x: $(Math.round(pq.base / 12)) });
    const saving = offer.month.amount * 12 - pq.amount;
    return (
      <button key={p} type="button" role="radio" aria-checked={on} className={`plan-card press${on ? " is-on" : ""}`} onClick={() => setPeriod(p)}>
        <span className="pc-top"><span className="pc-name">{p === "month" ? t("monthly") : t("annual")}</span><span className={`radio${on ? " is-on" : ""}`} aria-hidden="true"><span className="dot" /></span></span>
        {pq.discount ? <span className="was"><span className={mc}>{$(pq.base)}</span></span> : null}
        <span className="price"><span className={mc}>{$(pq.amount)}</span> <small>{p === "month" ? t("perMonth") : t("perYear")}</small></span>
        <span className="sub">{sub}</span>
        {p === "year" && saving > 0 ? <span className="save-tag">{t("save", { x: $(saving) })}</span> : null}
      </button>
    );
  });

  const codeField = (
    <div className="field">
      <label htmlFor="plans-code">{t("codeLabel")}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <div className={`input${offer.codeError ? " is-error" : ""}`} style={{ flex: 1 }}>
          <input id="plans-code" type="text" value={code} placeholder={t("codePh")} autoCapitalize="characters" autoComplete="off" maxLength={32}
            aria-invalid={!!offer.codeError} aria-describedby={offer.codeError ? "plans-code-err" : undefined}
            onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyCode(); }} />
        </div>
        <button className="btn btn-secondary press" type="button" style={{ flex: "none" }} onClick={applyCode}>{t("apply")}</button>
      </div>
      {offer.codeError ? <span className="err" id="plans-code-err"><span className="ph ph-x-circle-fill" aria-hidden="true" />{t(`codeErr.${offer.codeError}`, { country: countryName })}</span> : null}
    </div>
  );
  const studentRow = (desk: boolean) => offer.student.verified ? null : (
    <button type="button" className="set-row" style={{ ...(desk ? { border: 0, padding: 0, minHeight: 48 } : {}), background: "none", inlineSize: "100%", font: "inherit", textAlign: "start", cursor: "pointer", borderInline: 0, borderBlockStart: 0 }} onClick={() => setSheet("student")}>
      <span className="ph ph-student" aria-hidden="true" /><span className="set-l">{t("studentT")}<small>{t("studentS")}</small></span><span className="ph ph-caret-end flip ink-3" aria-hidden="true" />
    </button>
  );
  const facts = (
    <div className="facts">
      <p><span className="ph ph-calendar" aria-hidden="true" /><span>{t("facts.trial")}</span></p>
      <p><span className="ph ph-sync" aria-hidden="true" /><span>{t("facts.cancel")}</span></p>
      <p><span className="ph ph-refund" aria-hidden="true" /><span>{t("facts.refund")}</span></p>
    </div>
  );
  const payButton = closed || blocked
    ? <button type="button" className="btn btn-primary btn-lg btn-block is-disabled" aria-disabled="true">{t("toPay")}</button>
    : <Link href={payHref} className="btn btn-primary btn-lg btn-block press">{t("toPay")}</Link>;

  return (
    <>
      <header className="pg-top" style={{ gap: 4 }}>
        <Link href="/app" className="icon-btn plain only-mobile" aria-label={t("back")}><span className="ph ph-arrow back" aria-hidden="true" /></Link>
        <h1 className="pg-title" style={{ flex: 1 }}>{t("proName")}</h1>
      </header>
      <div className="pg-split">
        <div className="pg-stack" style={{ gap: 12 }}>
          <p className="t-body ink-2" style={{ fontSize: 15 }}>{t("plansLead")}</p>
          {closed ? <div className="notice is-info" role="status"><span className="ph ph-info" aria-hidden="true" /><span className="grow"><span>{t("closed")}</span></span></div> : null}
          {blocked ? <div className="notice is-info" role="status"><span className="ph ph-check-circle" aria-hidden="true" /><span className="grow"><b>{t("alreadyPro")}</b></span><span className="acts"><Link href="/app/settings/billing" className="btn btn-secondary btn-sm press">{t("seeMyPlan")}</Link></span></div> : null}
          <p className="pg-note" style={{ fontSize: 13 }}>
            <span className="ph ph-globe" aria-hidden="true" />
            <span>{t(`regionLine.${offer.region}`, { country: countryName })} <button type="button" className="hit" style={{ fontWeight: 700, background: "none", border: 0, padding: 0, font: "inherit", color: "var(--link)", cursor: "pointer", minBlockSize: 24 }} onClick={() => setSheet("country")}>{t("changeCountry")}</button></span>
          </p>
          <div className="plans" role="radiogroup" aria-label={t("billingPeriod")}>{cards}</div>
          {notice ? (
            <div className="notice is-info">
              <span className={notice.icon} aria-hidden="true" />
              <span className="grow"><b>{notice.t}</b><span>{notice.b}</span><span className="t-small ink-2" style={{ fontSize: 12.5 }}>{t("oneDiscount")}</span></span>
              {notice.remove ? <button type="button" className="btn btn-ghost btn-sm" style={{ flex: "none", padding: "0 10px" }} onClick={() => { setCode(""); router.replace(pathname, { scroll: false }); }}>{t("remove")}</button> : null}
            </div>
          ) : null}
          <div className="bl-mob">{facts}</div>
          <p className="t-over set-sec" style={{ marginBlockStart: 4 }}>{t("compareTitle")}</p>
          <div className="fp" role="table" aria-label={t("compareTitle")}>
            <div role="row" style={{ display: "contents" }}>
              <span className="fp-h fp-k" role="columnheader"><span className="sr-only">{t("compareTitle")}</span></span>
              <span className="fp-h" role="columnheader">{t("colFree")}</span>
              <span className="fp-h is-pro" role="columnheader"><span className="pro-tag">PRO</span></span>
            </div>
            {FP.map(([k, free], i) => {
              const last = i === FP.length - 1 ? " fp-last" : "";
              return (
                <div role="row" key={k} style={{ display: "contents" }}>
                  <span className={`fp-k${last}`} role="rowheader">{t(`fp.${k}`)}</span>
                  <span className={last.trim()} role="cell" aria-label={free ? t("included") : t("notIncluded")}><span className={free ? "ph ph-check-circle-fill yes" : "no"} aria-hidden="true" /></span>
                  <span className={`is-pro${last}`} role="cell" aria-label={t("included")}><span className="ph ph-check-circle-fill yes" aria-hidden="true" /></span>
                </div>
              );
            })}
          </div>
          <div className="bl-mob">
            {codeOpen || offer.code ? <section className="card" style={{ padding: "14px 16px" }}>{codeField}</section> : null}
            <div className="set">
              {codeOpen || offer.code ? null : (
                <button type="button" className="set-row" style={{ background: "none", inlineSize: "100%", font: "inherit", textAlign: "start", cursor: "pointer", borderInline: 0, borderBlockStart: 0 }} onClick={() => setCodeOpen(true)}>
                  <span className="ph ph-tag" aria-hidden="true" /><span className="set-l">{t("codeLabel")}<small>{t("codeKinds")}</small></span><span className="ph ph-caret-end flip ink-3" aria-hidden="true" />
                </button>
              )}
              {studentRow(false)}
            </div>
          </div>
        </div>
        <aside className="bl-desk">
          <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="t-over">{t("yourChoice")}</p>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}><b style={{ fontSize: 17 }}>{selName}</b><b style={{ fontSize: 22 }}><span className={mc}>{$(q.amount)}</span></b></div>
            <p className="t-small ink-2" style={{ fontSize: 13.5 }}>{then}</p>
            {payButton}
            {facts}
          </section>
          <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {codeField}
            {studentRow(true)}
          </section>
        </aside>
      </div>
      <footer className="save-bar pay-bar" style={{ gap: 8 }}>
        <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--ink-2)" }}><span>{selName}</span><b style={{ fontSize: 18, color: "var(--ink)" }}><span className={mc}>{$(q.amount)}</span></b></span>
        {payButton}
      </footer>

      <CountrySheet open={sheet === "country"} onClose={() => setSheet(null)} current={offer.country} countries={countries} fixture={fixture} />
      <StudentSheet open={sheet === "student"} onClose={() => setSheet(null)} locale={locale} prices={{ m: $(discounted(offer.month.base, 40, offer.month.currency)), y: $(discounted(offer.year.base, 40, offer.year.currency)) }} />
    </>
  );
}

function CountrySheet({ open, onClose, current, countries, fixture }: { open: boolean; onClose: () => void; current: string; countries: { code: string; name: string }[]; fixture: boolean }) {
  const t = useTranslations("billing");
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const save = async () => {
    setBusy(true); setErr(false);
    if (fixture) { router.replace(`${pathname}?country=${value}`, { scroll: false }); onClose(); setBusy(false); return; }
    const r = await billingPost("country", { country: value });
    setBusy(false);
    if (!r.ok) { setErr(true); return; }
    onClose();
    router.refresh();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t("country")}>
      <div className="field">
        <label htmlFor="bl-country">{t("countryAria")}</label>
        <select id="bl-country" className="bl-select" value={value} onChange={(e) => setValue(e.target.value)}>
          {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      {err ? <p className="err" role="alert"><span className="ph ph-x-circle-fill" aria-hidden="true" />{t("error")}</p> : null}
      <button type="button" className="btn btn-primary btn-lg btn-block press" onClick={save} aria-disabled={busy}>{t("countrySave")}</button>
      <button type="button" className="btn btn-ghost btn-block" style={{ minHeight: 44 }} onClick={onClose}>{t("notNow")}</button>
    </Sheet>
  );
}

function StudentSheet({ open, onClose, locale, prices }: { open: boolean; onClose: () => void; locale: "en" | "ar"; prices: { m: string; y: string } }) {
  const t = useTranslations("billing");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ err?: string; sent?: boolean; testLink?: string; busy?: boolean }>({});
  const send = async () => {
    if (!isStudentEmail(email)) { setState({ err: t("stErr") }); return; }
    setState({ busy: true });
    const r = await billingPost<{ testLink?: string }>("student", { action: "send", email, locale });
    if (!r.ok) { setState({ err: r.error === "not_student_email" ? t("stErr") : t("error") }); return; }
    setState({ sent: true, testLink: r.testLink });
  };
  return (
    <Sheet open={open} onClose={onClose} title={t("stTitle")} titleCenter ill="/ill/uxgate-ill-key.png">
      <p className="t-small ink-2" style={{ textAlign: "center", fontSize: 14.5 }}>{t("stBody")}</p>
      {state.sent ? (
        <div className="notice is-info" role="status"><span className="ph ph-mail" aria-hidden="true" /><span className="grow"><span>{t("stSent")}</span>
          {state.testLink ? <a href={state.testLink} className="hit" style={{ fontWeight: 700 }}>{t("stTestLink")}</a> : null}</span></div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="bl-uni">{t("stEmail")}</label>
            <div className={`input${state.err ? " is-error" : ""}`}><span className="ph ph-mail" aria-hidden="true" />
              <input id="bl-uni" type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!state.err} aria-describedby={state.err ? "bl-uni-err" : "bl-uni-help"} /></div>
            {state.err ? <span className="err" id="bl-uni-err"><span className="ph ph-x-circle-fill" aria-hidden="true" />{state.err}</span> : <span className="help" id="bl-uni-help">{t("stHelp")}</span>}
          </div>
          <p className="t-small ink-3" style={{ fontSize: 12.5 }}>{t("stDomains")}</p>
          <div className="notice is-info" style={{ padding: "10px 12px" }}><span className="ph ph-tag" aria-hidden="true" /><span className="grow"><span>{t("stPrice", { m: prices.m, y: prices.y })}</span></span></div>
          <button type="button" className="btn btn-primary btn-lg btn-block press" onClick={send} aria-disabled={state.busy}>{t("stGo")}</button>
        </>
      )}
      <button type="button" className="btn btn-ghost btn-block" style={{ minHeight: 44 }} onClick={onClose}>{state.sent ? t("close") : t("notNow")}</button>
    </Sheet>
  );
}
