"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LocaleSwitch } from "@/components/LocaleSwitch";

type Problem = "wrong" | "rate" | "generic";

/** Team password form: on the right password the server sets the team pass and the normal sign-in page opens. */
export function TeamGate() {
  const t = useTranslations("teamGate");
  const locale = useLocale();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const field = useRef<HTMLInputElement>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    if (!pw) { setProblem("wrong"); field.current?.focus(); return; }
    setBusy(true);
    setProblem(null);
    try {
      const r = await fetch("/api/team-access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
      if (r.ok) { location.assign(`/${locale}/signin`); return; }
      setProblem(r.status === 401 ? "wrong" : r.status === 429 ? "rate" : "generic");
      if (r.status === 401) { setPw(""); field.current?.focus(); }
    } catch {
      setProblem("generic");
    }
    setBusy(false);
  }

  const wrong = problem === "wrong";
  return (
    <div className="pg-soon">
      <header className="pub-nav"><Link href="/" aria-label="UXGate"><Logo height={30} /></Link><span style={{ flex: 1 }} /><LocaleSwitch /></header>
      <main className="soon team-gate">
        <section className="soon-hero" aria-labelledby="team-h1">
          <div className="soon-text">
            <span className="kind kind-soon"><span className="ph ph-lock" aria-hidden="true" />{t("chip")}</span>
            <h1 id="team-h1">{t("title")}</h1>
            <p className="soon-lead">{t("body")}</p>
            <form className="soon-form" onSubmit={submit} noValidate>
              {problem === "rate" || problem === "generic" ? (
                <div className="form-alert" role="alert"><span className="ph ph-warning" aria-hidden="true" /><div><b>{t(problem === "rate" ? "rateTitle" : "genericTitle")}</b><p>{t(problem === "rate" ? "rateBody" : "genericBody")}</p></div></div>
              ) : null}
              <label className="soon-lbl" htmlFor="team-pw">{t("label")}</label>
              <div className="soon-row">
                <div className={`input${wrong ? " is-error" : ""}`}>
                  <span className="ph ph-lock" aria-hidden="true" />
                  <input ref={field} id="team-pw" type={show ? "text" : "password"} autoComplete="current-password" dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)}
                    aria-invalid={wrong} aria-describedby={wrong ? "team-err" : undefined} />
                  <button type="button" className="icon-btn plain" style={{ inlineSize: 44, blockSize: 44, marginInlineEnd: -10 }} aria-label={show ? t("hide") : t("show")} aria-pressed={show} onClick={() => setShow((v) => !v)}>
                    <span className={`ph ph-${show ? "eye-slash" : "eye"}`} aria-hidden="true" />
                  </button>
                </div>
                <button type="submit" className="btn btn-primary btn-lg press" aria-busy={busy || undefined}>{t("go")}</button>
              </div>
              {wrong ? <span className="err" id="team-err"><span className="ph ph-x-circle-fill" aria-hidden="true" />{t("wrong")}</span> : null}
              <Link href="/" className="pg-link">{t("back")}</Link>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
