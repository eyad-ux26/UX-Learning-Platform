"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { billingPost } from "./api";

type Action = "pay" | "wallet" | "approve" | "decline" | "leave";

/** Test-mode stand-in for the provider's page. Each button sends the result through the same engine as a webhook. */
export function MockPay({ sessionId, pending }: { sessionId: string; pending: boolean }) {
  const t = useTranslations("billing");
  const router = useRouter();
  const [renewals, setRenewals] = useState<"ok" | "decline">("ok");
  const [busy, setBusy] = useState<Action | null>(null);
  const [err, setErr] = useState(false);
  const act = async (action: Action) => {
    setBusy(action); setErr(false);
    const r = await billingPost("mock", { session: sessionId, action, renewals });
    if (!r.ok) { setBusy(null); setErr(true); return; }
    router.replace(`/app/checkout/return?session=${sessionId}`);
  };
  const b = (action: Action, label: string, cls = "btn-secondary") => (
    <button type="button" className={`btn ${cls} btn-lg btn-block press`} aria-disabled={!!busy} onClick={() => !busy && act(action)}>
      {busy === action ? <span className="spin" aria-hidden="true" /> : null}{label}
    </button>
  );
  return (
    <>
      {err ? <p className="err" role="alert"><span className="ph ph-x-circle-fill" aria-hidden="true" />{t("error")}</p> : null}
      {pending ? b("approve", t("mock.approve"), "btn-primary") : (
        <>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="t-label" style={{ marginBlockEnd: 6 }}>{t("mock.renewals")}</legend>
            <div className="tabs" role="radiogroup" aria-label={t("mock.renewals")}>
              {(["ok", "decline"] as const).map((v) => (
                <button key={v} type="button" role="radio" aria-checked={renewals === v} className={`tab${renewals === v ? " is-on" : ""}`} onClick={() => setRenewals(v)}>{v === "ok" ? t("mock.renewOk") : t("mock.renewDecline")}</button>
              ))}
            </div>
          </fieldset>
          {b("pay", t("mock.pay"), "btn-primary")}
          {b("wallet", t("mock.wallet"))}
          {b("decline", t("mock.decline"))}
        </>
      )}
      {b("leave", t("mock.leave"), "btn-ghost")}
    </>
  );
}
