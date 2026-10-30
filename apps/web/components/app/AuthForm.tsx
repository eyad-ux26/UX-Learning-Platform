"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/browser";
import { authErrorKey, isEmail, MIN_PASSWORD, type AuthErrorKey } from "@/lib/auth";
import { play } from "@/lib/sound";

type Mode = "signup" | "signin";

export function AuthForm({ mode, linkError }: { mode: Mode; linkError?: boolean }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKey | "link" | "needEmail" | null>(linkError ? "link" : null);
  const [sent, setSent] = useState<null | "signup" | "magic">(null);
  const signup = mode === "signup";

  const callback = () => `${location.origin}/api/auth/callback?locale=${locale}`;
  const fail = (e: Parameters<typeof authErrorKey>[0]) => { setError(authErrorKey(e)); setBusy(false); play("error-soft"); };

  async function google() {
    setBusy(true); setError(null);
    const { error: e } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (e) fail(e);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!isEmail(email)) return setError("emailInvalid");
    if (signup && password.length < MIN_PASSWORD) return setError("weak");
    if (!signup && !password) return setError("invalid");
    setBusy(true);
    const auth = createClient().auth;
    if (signup) {
      const { data, error: e } = await auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: callback(), data: { locale } } });
      if (e) return fail(e);
      // With email confirmation on there is no session yet; the learner confirms from the email.
      if (data.session) router.push("/app"); else { setSent("signup"); setBusy(false); }
    } else {
      const { error: e } = await auth.signInWithPassword({ email: email.trim(), password });
      if (e) return fail(e);
      router.push("/app");
    }
  }

  async function magic() {
    setError(null);
    if (!isEmail(email)) return setError(email.trim() ? "emailInvalid" : "needEmail");
    setBusy(true);
    const { error: e } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback(), data: { locale } } });
    if (e) return fail(e);
    setSent("magic"); setBusy(false);
  }

  const errText = error ? (error === "link" ? t("e_link") : error === "needEmail" ? t("needEmail") : t(`e_${error}`)) : null;

  return (
    <div className="auth">
      <section className="auth-art only-desk" aria-hidden="true">
        <img className="auth-logo" src="/brand/logo-white.svg" alt="" />
        <div className="auth-art-mid">
          <img src="/ill/uxgate-ill-gate.png" alt="" />
          <span className="cursor-tag" style={{ position: "absolute", insetBlockStart: "18%", insetInlineStart: "12%", ["--c" as string]: "#78E4FC", ["--c-ink" as string]: "#012E4B" }}><span className="ph ph-cursor-fill" /><b className="num ltr">+10 XP</b></span>
          <span className="cursor-tag" style={{ position: "absolute", insetBlockEnd: "20%", insetInlineEnd: "10%" }}><span className="ph ph-cursor-fill" /><b>{t("youLabel")}</b></span>
        </div>
        <p className="auth-tag">{t("tagline")}</p>
      </section>

      <section className="auth-form">
        <header className="auth-top">
          <Link href="/" className="icon-btn plain only-mobile" aria-label={t("close")}><span className="ph ph-x" aria-hidden="true" /></Link>
          <span className="only-mobile"><Logo height={22} /></span>
          <span className="auth-switch only-desk t-small">
            <span className="ink-2">{signup ? t("have") : t("haveNot")}</span>{" "}
            <Link href={signup ? "/signin" : "/signup"} style={{ fontWeight: 700, color: "var(--link)" }}>{signup ? t("signinLink") : t("signupLink")}</Link>
          </span>
        </header>

        {sent ? (
          <div className="auth-box" role="status">
            <img src="/ill/uxgate-ill-mail.png" alt="" style={{ inlineSize: 120, blockSize: 120 }} />
            <h1 className="t-h1 h1-s">{t("checkTitle")}</h1>
            <p className="t-body ink-2">{t(sent === "signup" ? "checkSignup" : "checkMagic", { email: email.trim() })}</p>
            <button type="button" className="btn btn-secondary btn-block press" onClick={() => { setSent(null); setPassword(""); }}>{t("useOther")}</button>
          </div>
        ) : (
          <form className="auth-box" onSubmit={submit} noValidate>
            <div>
              <h1 className="t-h1 h1-s">{signup ? t("signupTitle") : t("signinTitle")}</h1>
              <p className="t-body ink-2" style={{ marginBlockStart: 4 }}>{signup ? t("signupLead") : t("signinLead")}</p>
            </div>
            {errText ? <p className="auth-err" role="alert"><span className="ph ph-x-circle-fill" aria-hidden="true" />{errText}</p> : null}
            <button type="button" className="btn btn-secondary btn-block press" style={{ color: "var(--ink)" }} onClick={google} disabled={busy}><span className="ph ph-google" aria-hidden="true" />{t("google")}</button>
            <div className="auth-or" aria-hidden="true"><span /><b className="t-small ink-3">{t("or")}</b><span /></div>
            <div className="field">
              <label htmlFor="au-email">{t("email")}</label>
              <div className="input"><span className="ph ph-mail" aria-hidden="true" /><input id="au-email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={error === "emailInvalid"} /></div>
            </div>
            <div className="field">
              <label htmlFor="au-pw">{t("password")}</label>
              <div className="input">
                <span className="ph ph-lock" aria-hidden="true" />
                <input id="au-pw" type={show ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" aria-describedby={signup ? "au-pw-help" : undefined} aria-invalid={error === "weak" || error === "invalid"} />
                <button type="button" className="icon-btn plain" style={{ inlineSize: 40, blockSize: 40, marginInlineEnd: -8 }} aria-label={show ? t("hide") : t("show")} aria-pressed={show} onClick={() => setShow((v) => !v)}><span className={`ph ph-${show ? "eye-slash" : "eye"}`} aria-hidden="true" /></button>
              </div>
              {signup ? <span id="au-pw-help" className="help">{t("pwHelp")}</span> : null}
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-block press" disabled={busy}>{busy ? t("wait") : signup ? t("create") : t("signin")}</button>
            <button type="button" className="btn btn-ghost btn-block" style={{ minBlockSize: 44 }} onClick={magic} disabled={busy}><span className="ph ph-mail" aria-hidden="true" />{t("magic")}</button>
            {signup ? <p className="t-small ink-3" style={{ textAlign: "center", fontSize: 13 }}>{t("terms1")}</p> : null}
            <p className="t-small ink-2 only-mobile" style={{ textAlign: "center", justifyContent: "center", display: undefined }}>{signup ? t("have") : t("haveNot")}{" "}<Link href={signup ? "/signin" : "/signup"} style={{ fontWeight: 700, color: "var(--link)" }}>{signup ? t("signinLink") : t("signupLink")}</Link></p>
          </form>
        )}
      </section>
    </div>
  );
}
