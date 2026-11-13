"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/Logo";
import { isEmail, MIN_PASSWORD } from "@/lib/auth";
import {
  appleAction,
  forgotAction,
  googleAction,
  magicLinkAction,
  resendSignupAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  type AuthError,
  type AuthResult,
} from "@/app/[locale]/auth/actions";
import { play } from "@/lib/sound";

// Sign up, sign in, forgot password, check your email and set a new password (canvas v63, SystemPages and S4-12 form errors).
// Errors (design audit U1): the message sits under the field, the field gets aria-invalid and aria-describedby, focus moves
// to the first field in error and what the learner typed stays. Sign in never says which of the two fields is wrong.
// Problems with no field (expired link, too many tries) use one .form-alert at the top.

/** Google's own four-colour "G" mark, used as Google's branding guidelines require. */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

type Mode = "signup" | "signin";
type Field = "email" | "pw";
type FieldErr = {
  field: Field;
  key: "eEmail" | "eNeedEmail" | "eTaken" | "eShort" | "eShortHas" | "eWrong" | "eSame";
  n?: number;
};
type AlertKey = "link" | "resetLink" | "tooMany" | "rate" | "unconfirmed" | "generic" | "expired";
type Sent = "signup" | "magic" | "reset";

const failed = (): AuthResult => ({ ok: false, error: "generic" });
const RESEND_AFTER = 60;

/** Page frame: the minimal header (logo and language switch, a close button on phones) and the centred column. */
function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth4");
  return (
    <div
      style={{
        minBlockSize: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--ground-grad)",
        color: "var(--ink)",
      }}
    >
      {/* The wrappers carry only-mobile / only-desk, because .pub-nav sets its own display. */}
      <div className="only-mobile">
        <header className="pub-nav" style={{ borderBlockEnd: 0, background: "transparent" }}>
          <Link href="/" className="icon-btn plain" aria-label={t("close")} style={{ marginInlineStart: -8 }}>
            <span className="ph ph-x" aria-hidden="true" />
          </Link>
          <Logo height={26} />
          <span style={{ flex: 1 }} />
          <LocaleSwitch />
        </header>
      </div>
      <div className="only-desk">
        <header className="pub-nav" style={{ flex: 1 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", minBlockSize: 44 }}>
            <Logo height={34} />
          </Link>
          <span style={{ flex: 1 }} />
          <LocaleSwitch />
        </header>
      </div>
      <main className="auth" style={{ minBlockSize: 0, background: "none" }}>
        {children}
      </main>
    </div>
  );
}

/** The one alert for problems that belong to no field. */
function FormAlert({ title, body, act }: { title: string; body: string; act?: React.ReactNode }) {
  return (
    <div className="form-alert" role="alert">
      <span className="ph ph-warning" aria-hidden="true" />
      <div>
        <b>{title}</b>
        <p>{body}</p>
        {act}
      </div>
    </div>
  );
}

const actBtn: React.CSSProperties = {
  background: "none",
  border: 0,
  padding: 0,
  color: "var(--link)",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
  fontSize: 14,
};

function Alert({ k, onResend }: { k: AlertKey; onResend?: () => void }) {
  const t = useTranslations("auth4");
  const resend = onResend ? (
    <button type="button" className="form-alert-act" style={actBtn} onClick={onResend}>
      {t(k === "unconfirmed" ? "unconfirmedAct" : "linkAct")}
    </button>
  ) : null;
  switch (k) {
    case "link":
      return <FormAlert title={t("linkTitle")} body={t("linkBody")} act={resend} />;
    case "unconfirmed":
      return <FormAlert title={t("unconfirmedTitle")} body={t("unconfirmedBody")} act={resend} />;
    case "tooMany":
      return (
        <FormAlert
          title={t("tooManyTitle")}
          body={t("tooManyBody")}
          act={
            <Link href="/forgot" className="form-alert-act" style={{ color: "var(--link)" }}>
              {t("tooManyAct")}
            </Link>
          }
        />
      );
    case "rate":
      return <FormAlert title={t("tooManyTitle")} body={t("rateBody")} />;
    case "resetLink":
      return <FormAlert title={t("resetLinkTitle")} body={t("resetLinkBody")} />;
    case "expired":
      return (
        <FormAlert
          title={t("resetLinkTitle")}
          body={t("rExpiredBody")}
          act={
            <Link href="/forgot" className="form-alert-act" style={{ color: "var(--link)" }}>
              {t("rExpiredAct")}
            </Link>
          }
        />
      );
    default:
      return <FormAlert title={t("genericTitle")} body={t("genericBody")} />;
  }
}

/** Message under a field, with the id the input points at. */
function ErrText({ id, err }: { id: string; err: FieldErr }) {
  const t = useTranslations("auth4");
  return (
    <span className="err" id={id}>
      <span className="ph ph-x-circle-fill" aria-hidden="true" />
      {t(err.key, { n: err.n ?? 0 })}
    </span>
  );
}

function EmailField({
  id,
  value,
  onChange,
  err,
  inputRef,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  err: FieldErr | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslations("auth4");
  const bad = err?.field === "email";
  return (
    <div className="field">
      <label htmlFor={id}>{t("email")}</label>
      <div className={`input${bad ? " is-error" : ""}`}>
        <span className="ph ph-mail" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={bad}
          aria-describedby={bad ? `${id}-err` : undefined}
        />
      </div>
      {bad && err ? <ErrText id={`${id}-err`} err={err} /> : null}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  err,
  inputRef,
  autoComplete,
  help,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  err: FieldErr | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  autoComplete: string;
  help?: boolean;
  children?: React.ReactNode;
}) {
  const t = useTranslations("auth4");
  const [show, setShow] = useState(false);
  const bad = err?.field === "pw";
  const describedBy = bad ? `${id}-err` : help ? `${id}-help` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input${bad ? " is-error" : ""}`}>
        <span className="ph ph-lock" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          aria-invalid={bad}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="icon-btn plain"
          style={{ inlineSize: 44, blockSize: 44, marginInlineEnd: -10 }}
          aria-label={show ? t("hide") : t("show")}
          aria-pressed={show}
          onClick={() => setShow((v) => !v)}
        >
          <span className={`ph ph-${show ? "eye-slash" : "eye"}`} aria-hidden="true" />
        </button>
      </div>
      {bad && err ? (
        <ErrText id={`${id}-err`} err={err} />
      ) : help ? (
        <span id={`${id}-help`} className="help">
          {t("pwHelp")}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/** Moves focus to the first field in error each time an error is shown. */
function useFocusError(err: FieldErr | null, refs: Record<Field, React.RefObject<HTMLInputElement | null>>) {
  useEffect(() => {
    if (err) refs[err.field].current?.focus();
    // refs are stable; err is a new object each time an error is set, so a repeated error focuses again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [err]);
}

/** Saves this page's language on the account first, so the email arrives in it (best effort). */
async function saveEmailLocale(email: string, locale: string) {
  await fetch("/api/auth/email-locale", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: email.trim(), locale }),
  }).catch(() => null);
}

/** "Check your email": works once, for 1 hour; Send again after a 60 s countdown. */
function SentView({
  kind,
  email,
  onAgain,
  onOther,
}: {
  kind: Sent;
  email: string;
  onAgain: () => Promise<boolean>;
  onOther: () => void;
}) {
  const t = useTranslations("auth4");
  const [left, setLeft] = useState(RESEND_AFTER);
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState(false);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const again = async () => {
    setBusy(true);
    setRate(false);
    const ok = await onAgain();
    setBusy(false);
    if (ok) setLeft(RESEND_AFTER);
    else setRate(true);
  };
  const lead = kind === "reset" ? t("sLeadReset") : kind === "signup" ? t("sLeadSignup") : t("sLead");
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <>
      <img src="/ill/uxgate-ill-mail.png" alt="" style={{ inlineSize: 132, blockSize: 132, alignSelf: "center" }} />
      <div className="pg-stack" role="status" style={{ gap: 6, textAlign: "center", alignItems: "center" }}>
        <h1 className="t-h1" style={{ fontSize: 28 }}>
          {t("sTitle")}
        </h1>
        <p className="t-small ink-2" style={{ fontSize: 15, maxInlineSize: "34ch" }}>
          {lead}{" "}
          <b className="ltr" dir="ltr" style={{ color: "var(--ink)" }}>
            {email.trim()}
          </b>
        </p>
      </div>
      {rate ? <Alert k="rate" /> : null}
      <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="pg-note">
          <span className="ph ph-clock" aria-hidden="true" />
          <span>{t("sOnce")}</span>
        </p>
        <p className="pg-note">
          <span className="ph ph-search" aria-hidden="true" />
          <span>{t("sSpam")}</span>
        </p>
      </div>
      <button
        className="btn btn-secondary btn-block"
        type="button"
        disabled={left > 0 || busy}
        aria-disabled={left > 0 || busy}
        onClick={again}
      >
        <span className="ph ph-sync" aria-hidden="true" />
        {left > 0 ? (
          <>
            {t("sAgainIn")}{" "}
            <span className="num ltr" aria-live="off">
              {clock}
            </span>
          </>
        ) : (
          t("sAgain")
        )}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-block"
        style={{ minBlockSize: 44, marginBlockStart: -4 }}
        onClick={onOther}
      >
        {t("sOther")}
      </button>
    </>
  );
}

export function AuthForm({ mode, linkError, apple = false }: { mode: Mode; linkError?: boolean; apple?: boolean }) {
  const t = useTranslations("auth4");
  const locale = useLocale();
  const router = useRouter();
  const signup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<FieldErr | null>(null);
  const [alert, setAlert] = useState<AlertKey | null>(linkError ? "link" : null);
  const [sent, setSent] = useState<Sent | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  useFocusError(err, { email: emailRef, pw: pwRef });

  const showError = (e: AuthError) => {
    play("error-soft");
    if (e === "emailInvalid") return setErr({ field: "email", key: "eEmail" });
    if (e === "needEmail") return setErr({ field: "email", key: "eNeedEmail" });
    if (e === "exists") return setErr({ field: "email", key: "eTaken" });
    if (e === "weak") return setErr({ field: "pw", key: password ? "eShortHas" : "eShort", n: password.length });
    if (e === "invalid") return setErr({ field: "pw", key: "eWrong" });
    setAlert(e === "rate" ? (signup ? "rate" : "tooMany") : e === "unconfirmed" ? "unconfirmed" : "generic");
  };
  const reset = () => {
    setErr(null);
    setAlert(null);
  };

  const done = (r: AuthResult) => {
    setBusy(false);
    if (!r.ok) return showError(r.error);
    if (r.next === "app")
      return router.push(r.restored ? { pathname: "/app/settings", query: { restored: "1" } } : "/app");
    setSent(r.next === "sent-signup" ? "signup" : "magic");
  };

  async function provider(which: "google" | "apple") {
    reset();
    setBusy(true);
    const r = await (which === "apple" ? appleAction : googleAction)({ locale }).catch(failed);
    if (!r.ok) {
      setBusy(false);
      return showError(r.error);
    }
    if (r.url) location.assign(r.url);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    reset();
    if (!isEmail(email)) return showError("emailInvalid");
    if (signup && password.length < MIN_PASSWORD) return showError("weak");
    if (!signup && !password) return showError("invalid");
    setBusy(true);
    done(await (signup ? signUpAction : signInAction)({ email, password, locale }).catch(failed));
  }

  async function magic() {
    reset();
    if (!isEmail(email)) return showError(email.trim() ? "emailInvalid" : "needEmail");
    setBusy(true);
    await saveEmailLocale(email, locale);
    done(await magicLinkAction({ email, locale }).catch(failed));
  }

  const again = async () => {
    const r =
      sent === "signup"
        ? await resendSignupAction({ email, locale }).catch(failed)
        : await magicLinkAction({ email, locale }).catch(failed);
    return r.ok;
  };

  if (sent) {
    return (
      <AuthShell>
        <SentView
          kind={sent}
          email={email}
          onAgain={again}
          onOther={() => {
            setSent(null);
            setPassword("");
            setTimeout(() => emailRef.current?.focus(), 0);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={submit} noValidate style={{ display: "contents" }}>
        <div className="pg-stack" style={{ gap: 4 }}>
          <h1 className="t-h1" style={{ fontSize: 28 }}>
            {signup ? t("signupTitle") : t("signinTitle")}
          </h1>
          <p className="t-small ink-2" style={{ fontSize: 15 }}>
            {signup ? t("signupLead") : t("signinLead")}
          </p>
        </div>
        {alert ? <Alert k={alert} onResend={alert === "link" || alert === "unconfirmed" ? magic : undefined} /> : null}
        <div className="pg-stack" style={{ gap: 10 }}>
          {apple ? (
            <button className="btn btn-block btn-apple" type="button" onClick={() => provider("apple")} disabled={busy}>
              <span className="ph ph-apple" aria-hidden="true" />
              {signup ? t("appleUp") : t("appleIn")}
            </button>
          ) : null}
          <button className="btn btn-block btn-google" type="button" onClick={() => provider("google")} disabled={busy}>
            <GoogleG />
            {signup ? t("googleUp") : t("googleIn")}
          </button>
        </div>
        <div className="auth-or" aria-hidden="true">
          <i />
          <b className="t-small ink-3" style={{ fontWeight: 700 }}>
            {t("or")}
          </b>
          <i />
        </div>
        <EmailField
          id="au-email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (err?.field === "email") setErr(null);
          }}
          err={err}
          inputRef={emailRef}
        />
        <PasswordField
          id="au-pw"
          label={t("password")}
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (err?.field === "pw") setErr(null);
          }}
          err={err}
          inputRef={pwRef}
          autoComplete={signup ? "new-password" : "current-password"}
          help={signup}
        >
          {signup ? null : (
            <Link
              href="/forgot"
              style={{
                alignSelf: "flex-end",
                fontWeight: 700,
                fontSize: 14,
                color: "var(--link)",
                minBlockSize: 44,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {t("forgotQ")}
            </Link>
          )}
        </PasswordField>
        <button
          type="submit"
          className="btn btn-primary btn-lg btn-block press"
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {busy ? t("wait") : signup ? t("create") : t("signin")}
        </button>
        <button
          className="btn btn-ghost btn-block"
          type="button"
          style={{ minBlockSize: 44, marginBlockStart: -4 }}
          onClick={magic}
          disabled={busy}
        >
          <span className="ph ph-mail" aria-hidden="true" />
          {t("magic")}
        </button>
        <div
          style={{
            marginBlockStart: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            textAlign: "center",
            paddingBlockStart: 8,
          }}
        >
          {signup ? (
            <p className="t-small ink-3" style={{ fontSize: 13 }}>
              {t("terms1")}{" "}
              <Link href="/terms" style={{ color: "var(--link)" }}>
                {t("terms")}
              </Link>{" "}
              {t("and")}
              {locale === "ar" ? "" : " "}
              <Link href="/privacy" style={{ color: "var(--link)" }}>
                {t("privacy")}
              </Link>
              .
            </p>
          ) : null}
          <p className="t-small ink-2">
            {signup ? t("haveQ") : t("newQ")}{" "}
            <Link
              href={signup ? "/signin" : "/signup"}
              style={{
                fontWeight: 700,
                color: "var(--link)",
                display: "inline-flex",
                alignItems: "center",
                minBlockSize: 44,
              }}
            >
              {signup ? t("haveSwap") : t("newSwap")}
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}

/** "Forgot password?": sends a reset link. Same answer whether or not the email has an account. */
export function ForgotForm({ linkError }: { linkError?: boolean }) {
  const t = useTranslations("auth4");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<FieldErr | null>(null);
  const [alert, setAlert] = useState<AlertKey | null>(linkError ? "resetLink" : null);
  const [sent, setSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  useFocusError(err, { email: emailRef, pw: pwRef });

  const send = async (): Promise<AuthResult> => {
    await saveEmailLocale(email, locale);
    return forgotAction({ email, locale }).catch(failed);
  };

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr(null);
    setAlert(null);
    if (!isEmail(email)) {
      play("error-soft");
      return setErr({ field: "email", key: email.trim() ? "eEmail" : "eNeedEmail" });
    }
    setBusy(true);
    const r = await send();
    setBusy(false);
    if (r.ok) return setSent(true);
    play("error-soft");
    if (r.error === "emailInvalid" || r.error === "needEmail")
      return setErr({ field: "email", key: r.error === "needEmail" ? "eNeedEmail" : "eEmail" });
    setAlert(r.error === "rate" ? "rate" : "generic");
  }

  if (sent) {
    return (
      <AuthShell>
        <SentView
          kind="reset"
          email={email}
          onAgain={async () => (await send()).ok}
          onOther={() => {
            setSent(false);
            setTimeout(() => emailRef.current?.focus(), 0);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={submit} noValidate style={{ display: "contents" }}>
        <img src="/ill/uxgate-ill-key.png" alt="" style={{ inlineSize: 120, blockSize: 120, alignSelf: "center" }} />
        <div className="pg-stack" style={{ gap: 4, textAlign: "center", alignItems: "center" }}>
          <h1 className="t-h1" style={{ fontSize: 28 }}>
            {t("fTitle")}
          </h1>
          <p className="t-small ink-2" style={{ fontSize: 15, maxInlineSize: "34ch" }}>
            {t("fLead")}
          </p>
        </div>
        {alert ? <Alert k={alert} /> : null}
        <EmailField
          id="fp-email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (err) setErr(null);
          }}
          err={err}
          inputRef={emailRef}
        />
        <button
          type="submit"
          className="btn btn-primary btn-lg btn-block press"
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {busy ? t("wait") : t("fSend")}
        </button>
        <p className="pg-note">
          <span className="ph ph-info" aria-hidden="true" />
          <span>{t("fNote")}</span>
        </p>
        <Link href="/signin" className="btn btn-ghost btn-block" style={{ minBlockSize: 44, marginBlockStart: "auto" }}>
          <span
            className="ph ph-arrow"
            aria-hidden="true"
            style={locale === "ar" ? undefined : { transform: "scaleX(-1)" }}
          />
          {t("backIn")}
        </Link>
      </form>
    </AuthShell>
  );
}

/** Set a new password after following the reset link (the callback signed the learner in), then go to the app. */
export function ResetForm({ signedIn, restored }: { signedIn: boolean; restored?: boolean }) {
  const t = useTranslations("auth4");
  const locale = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<FieldErr | null>(null);
  const [alert, setAlert] = useState<AlertKey | null>(signedIn ? null : "expired");
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  useFocusError(err, { email: emailRef, pw: pwRef });

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr(null);
    setAlert(null);
    if (password.length < MIN_PASSWORD) {
      play("error-soft");
      return setErr({ field: "pw", key: password ? "eShortHas" : "eShort", n: password.length });
    }
    setBusy(true);
    const r = await resetPasswordAction({ password, locale }).catch(failed);
    if (r.ok) return router.push(restored ? { pathname: "/app/settings", query: { restored: "1" } } : "/app");
    setBusy(false);
    play("error-soft");
    if (r.error === "weak") return setErr({ field: "pw", key: "eShortHas", n: password.length });
    if (r.error === "same") return setErr({ field: "pw", key: "eSame" });
    setAlert(r.error === "expired" ? "expired" : r.error === "rate" ? "rate" : "generic");
  }

  return (
    <AuthShell>
      <form onSubmit={submit} noValidate style={{ display: "contents" }}>
        <img src="/ill/uxgate-ill-key.png" alt="" style={{ inlineSize: 120, blockSize: 120, alignSelf: "center" }} />
        <div className="pg-stack" style={{ gap: 4, textAlign: "center", alignItems: "center" }}>
          <h1 className="t-h1" style={{ fontSize: 28 }}>
            {t("rTitle")}
          </h1>
          <p className="t-small ink-2" style={{ fontSize: 15, maxInlineSize: "34ch" }}>
            {t("rLead")}
          </p>
        </div>
        {alert ? <Alert k={alert} /> : null}
        {alert === "expired" ? null : (
          <>
            <PasswordField
              id="rp-pw"
              label={t("rLabel")}
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (err) setErr(null);
              }}
              err={err}
              inputRef={pwRef}
              autoComplete="new-password"
              help
            />
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block press"
              disabled={busy}
              aria-busy={busy || undefined}
            >
              {busy ? t("wait") : t("rSave")}
            </button>
          </>
        )}
        <Link href="/signin" className="btn btn-ghost btn-block" style={{ minBlockSize: 44, marginBlockStart: "auto" }}>
          <span
            className="ph ph-arrow"
            aria-hidden="true"
            style={locale === "ar" ? undefined : { transform: "scaleX(-1)" }}
          />
          {t("backIn")}
        </Link>
      </form>
    </AuthShell>
  );
}
