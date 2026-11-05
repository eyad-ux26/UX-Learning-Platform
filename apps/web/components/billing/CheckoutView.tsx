"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { paddleOpenOptions, type PaddleCustomer } from "@/lib/billing/paddle-open";
import { billingPost } from "./api";

type PaddleOpen = { transactionId: string; clientToken: string; env: "sandbox" | "production"; sessionId: string; successUrl: string; country: string | null; email?: string | null };
type PaddleJs = {
  Environment: { set: (env: string) => void };
  Initialize: (o: { token: string; eventCallback?: (e: { name?: string }) => void }) => void;
  Checkout: { open: (o: { transactionId: string; customer?: PaddleCustomer; settings: Record<string, unknown> }) => void };
};

let paddleLoad: Promise<PaddleJs> | null = null;
/** Paddle.js v2 from Paddle's own CDN (allowed in the CSP). Loaded only when a Paddle checkout opens. */
function loadPaddle(): Promise<PaddleJs> {
  paddleLoad ??= new Promise((resolve, reject) => {
    const w = window as unknown as { Paddle?: PaddleJs };
    if (w.Paddle) return resolve(w.Paddle);
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = () => (w.Paddle ? resolve(w.Paddle) : reject(new Error("paddle")));
    s.onerror = () => { paddleLoad = null; reject(new Error("paddle")); };
    document.head.appendChild(s);
  });
  return paddleLoad;
}

async function openPaddle(p: PaddleOpen, locale: string) {
  const Paddle = await loadPaddle();
  if (p.env === "sandbox") Paddle.Environment.set("sandbox");
  Paddle.Initialize({
    token: p.clientToken,
    eventCallback: (e) => {
      if (e.name === "checkout.completed") window.location.assign(p.successUrl);
      if (e.name === "checkout.closed") window.location.assign(`${p.successUrl}&left=1`);
    },
  });
  // The billing country starts as the country the price is for; a different card country moves renewals to the Gulf price.
  Paddle.Checkout.open(paddleOpenOptions(p, locale));
}

/**
 * Opens a transaction Paddle created itself, from one of its emailed payment links (?_ptxn=, a card update or an
 * invoice). No session of ours is made: Paddle's webhooks apply the result. Done or closed, the learner lands on
 * Plan and billing.
 */
export function PaddleLinkCheckout({ transactionId, clientToken, env, locale, doneUrl }: { transactionId: string; clientToken: string; env: "sandbox" | "production"; locale: "en" | "ar"; doneUrl: string }) {
  const t = useTranslations("billing");
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    loadPaddle().then((Paddle) => {
      if (env === "sandbox") Paddle.Environment.set("sandbox");
      Paddle.Initialize({
        token: clientToken,
        eventCallback: (e) => { if (e.name === "checkout.completed" || e.name === "checkout.closed") window.location.assign(doneUrl); },
      });
      Paddle.Checkout.open({ transactionId, settings: { displayMode: "overlay", locale, successUrl: doneUrl, theme: "light" } });
    }).catch(() => setFailed(true));
  }, [transactionId, clientToken, env, locale, doneUrl]);
  return (
    <main className="bye" role="status" aria-live="polite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ill/uxgate-ill-shield.png" alt="" width={140} height={140} />
      {failed ? null : <span className="spin" style={{ color: "var(--link)", inlineSize: 28, blockSize: 28 }} aria-hidden="true" />}
      <h1>{failed ? t("payError") : t("paying")}</h1>
      <Link href="/app/settings/billing" className="btn btn-ghost btn-block">{t("tBilling")}</Link>
    </main>
  );
}

/** Starts a checkout and hands the learner to the provider: a redirect (Paymob, test mode) or Paddle's overlay. */
export async function startPayment(body: { period: "month" | "year"; code?: string | null; kind: "new" | "renewal" | "card"; locale: "en" | "ar"; intl?: boolean }): Promise<string | null> {
  const r = await billingPost<{ url?: string; paddle?: PaddleOpen; detail?: string }>("checkout", body);
  if (!r.ok) return r.error === "code" ? `code:${String(r.detail ?? "invalid")}` : r.error;
  if (r.url) { window.location.assign(r.url); return null; }
  if (r.paddle) {
    try { await openPaddle(r.paddle, body.locale); return null; } catch { return "provider"; }
  }
  return "provider";
}

export function PayButton({ label, period, code, intl, locale, disabled }: { label: string; period: "month" | "year"; code: string | null; intl?: boolean; locale: "en" | "ar"; disabled?: boolean }) {
  const t = useTranslations("billing");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    if (busy || disabled) return;
    setBusy(true); setErr(null);
    const e = await startPayment({ period, code, kind: "new", locale, ...(intl ? { intl: true } : {}) });
    setBusy(false);
    if (e) setErr(e);
  };
  const msg = !err ? null : err === "payments_closed" ? t("closed") : err === "already_pro" ? t("alreadyPro") : err.startsWith("code:") ? t(`codeErr.${err.slice(5) as "invalid"}`, { country: "" }) : t("payError");
  return (
    <>
      {msg ? (
        <div className="notice" role="alert"><span className="ph ph-warning" aria-hidden="true" /><span className="grow"><span>{msg}</span></span>
          {err === "already_pro" ? <span className="acts"><Link href="/app/settings/billing" className="btn btn-secondary btn-sm press">{t("seeMyPlan")}</Link></span> : null}</div>
      ) : null}
      <button type="button" className={`btn btn-primary btn-lg btn-block press${disabled ? " is-disabled" : ""}`} aria-disabled={disabled || busy} onClick={go}>
        {busy ? <><span className="spin" aria-hidden="true" />{t("paying")}</> : <>{label}<span className="ph ph-external" aria-hidden="true" /></>}
      </button>
    </>
  );
}
