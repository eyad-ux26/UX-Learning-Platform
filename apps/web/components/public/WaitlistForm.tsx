"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { isEmail } from "@/lib/auth";
import type { WaitlistStatus } from "@/lib/waitlist";

type Problem = "invalid" | "network" | "rate";
const mail = (chunks: React.ReactNode) => <bdi className="soon-mail">{chunks}</bdi>;

/**
 * Launch-notify form (canvas v70, PL-1). States: idle, busy (aria-busy), invalid (message under the field, aria-invalid,
 * value kept, focus on the field), network and too-many (role=alert box, value kept), then sent or already, which replace
 * the form with a status panel. `expired`: the visitor came from a confirmation link older than 7 days.
 */
export function WaitlistForm({ expired = false }: { expired?: boolean }) {
  const t = useTranslations("soon");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [done, setDone] = useState<{ status: WaitlistStatus; email: string } | null>(null);
  const [showExpired, setShowExpired] = useState(expired);
  const field = useRef<HTMLInputElement>(null);
  const trap = useRef<HTMLInputElement>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    setShowExpired(false);
    if (!isEmail(email)) { setProblem("invalid"); field.current?.focus(); return; }
    setProblem(null);
    setBusy(true);
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale, trap: trap.current?.value ?? "" }),
      });
      const body = (await r.json().catch(() => ({}))) as { status?: WaitlistStatus };
      if (r.ok && (body.status === "sent" || body.status === "already")) return setDone({ status: body.status, email: email.trim() });
      setProblem(r.status === 400 ? "invalid" : r.status === 429 ? "rate" : "network");
      if (r.status === 400) field.current?.focus();
    } catch {
      setProblem("network");
    } finally {
      setBusy(false);
    }
  }

  function again() {
    setDone(null);
    setEmail("");
    setTimeout(() => field.current?.focus(), 0);
  }

  if (done) {
    const sent = done.status === "sent";
    return (
      <div className={`soon-done${sent ? "" : " is-info"}`} role="status">
        <span className="soon-done-ic" aria-hidden="true"><span className={`ph ${sent ? "ph-mail" : "ph-check-circle-fill"}`} /></span>
        <div className="soon-done-text">
          <b>{t(sent ? "sentT" : "alreadyT")}</b>
          <p>{t.rich(sent ? "sentB" : "alreadyB", { email: done.email, mail })}</p>
          {sent ? <p className="soon-done-note"><span className="ph ph-search" aria-hidden="true" />{t("sentNote")}</p> : null}
          <button type="button" className="pg-link" style={{ background: "none", border: 0, cursor: "pointer", font: "inherit" }} onClick={again}>{t("other")}</button>
        </div>
      </div>
    );
  }

  const invalid = problem === "invalid";
  return (
    <form className="soon-form" onSubmit={submit} noValidate aria-labelledby="soon-lbl">
      <label className="soon-lbl" id="soon-lbl" htmlFor="soon-email">{t("formLbl")}</label>
      {showExpired ? <Alert icon="ph-clock-countdown" title={t("expiredT")} body={t("expiredB")} /> : null}
      {problem === "network" ? <Alert icon="ph-wifi-slash" title={t("netTitle")} body={t("netBody")} /> : null}
      {problem === "rate" ? <Alert icon="ph-hourglass" title={t("rateTitle")} body={t("rateBody")} /> : null}
      <div className="soon-row">
        <div className={`input${invalid ? " is-error" : ""}`}>
          <span className="ph ph-mail" aria-hidden="true" />
          <input ref={field} id="soon-email" type="email" name="email" autoComplete="email" inputMode="email" placeholder="name@example.com" dir="ltr"
            value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={invalid} aria-describedby={`${invalid ? "soon-err " : ""}soon-consent`} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg press soon-btn" aria-busy={busy || undefined}>{t("notify")}</button>
      </div>
      {invalid ? <span className="err soon-err" id="soon-err"><span className="ph ph-x-circle-fill" aria-hidden="true" />{t("badEmail")}</span> : null}
      {busy ? <span className="sr-only" role="status">{t("sending")}</span> : null}
      {/* Hidden from people and screen readers; bots that fill every field give themselves away. */}
      <div aria-hidden="true" className="sr-only"><label>Website<input ref={trap} type="text" name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <p className="soon-consent" id="soon-consent">{t.rich("consent", { link: (c) => <Link href="/privacy">{c}</Link> })}</p>
    </form>
  );
}

function Alert({ icon, title, body }: { icon: string; title: string; body: string }) {
  return <div className="form-alert" role="alert"><span className={`ph ${icon}`} aria-hidden="true" /><div><b>{title}</b><p>{body}</p></div></div>;
}
