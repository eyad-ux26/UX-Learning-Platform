"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { moneyCls } from "@/lib/billing/pricing";
import { billingPost } from "./api";
import { startPayment } from "./CheckoutView";
import { Sheet } from "./Sheet";
import { Toast } from "./Toast";

type Period = "month" | "year";

/** Pay the next period now, or pay again with another card in the grace period. Hands over to the provider. */
export function PayNow({ kind, period, label, cls = "btn btn-primary btn-sm press", icon }: { kind: "renewal" | "card"; period: Period; label: string; cls?: string; icon?: string }) {
  const t = useTranslations("billing");
  const locale = useLocale() as "en" | "ar";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true); setErr(false);
    const e = await startPayment({ period, kind, locale });
    setBusy(false);
    if (e) setErr(true);
  };
  return (
    <>
      <button type="button" className={cls} aria-disabled={busy} onClick={go}>
        {busy ? <span className="spin" aria-hidden="true" /> : icon ? <span className={icon} aria-hidden="true" /> : null}{label}
      </button>
      {err ? <span className="err" role="alert" style={{ flexBasis: "100%" }}><span className="ph ph-x-circle-fill" aria-hidden="true" />{t("payError")}</span> : null}
    </>
  );
}

/** Resume a cancelled plan before it ends. */
export function ResumeButton({ label }: { label: string }) {
  const t = useTranslations("billing");
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true); setErr(false);
    const r = await billingPost("plan", { action: "resume" });
    setBusy(false);
    if (!r.ok) { setErr(true); return; }
    router.replace(`${pathname}?done=resume`, { scroll: false });
    router.refresh();
  };
  return (
    <>
      <button type="button" className="btn btn-primary press" style={{ flex: 1 }} aria-disabled={busy} onClick={go}><span className="ph ph-retry" aria-hidden="true" />{label}</button>
      {err ? <span className="err" role="alert" style={{ flexBasis: "100%" }}><span className="ph ph-x-circle-fill" aria-hidden="true" />{t("error")}</span> : null}
    </>
  );
}

export type ChangeOption = { period: Period; name: string; price: string; per: string; sub: string };

/** Change plan: monthly and annual switch at the end of the paid period, with no proration. */
export function ChangePlan({ current, pending, options, when, currency }: {
  current: Period; pending: Period | null; options: ChangeOption[]; when: Record<Period, { t: string; b: string; go: string }>; currency: string;
}) {
  const t = useTranslations("billing");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<Period>(pending ?? current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const target = pick === current ? null : pick;
  const save = async (period: Period) => {
    setBusy(true); setErr(false);
    const r = await billingPost("plan", { action: "change", period });
    setBusy(false);
    if (!r.ok) { setErr(true); return; }
    setOpen(false);
    router.replace(`${pathname}?done=${period === current ? "keep" : "change"}`, { scroll: false });
    router.refresh();
  };
  const w = target ? when[target] : { t: t("chWhenSame"), b: t("chWhenSameB"), go: t("chGoSame") };
  return (
    <>
      <button type="button" className="btn btn-secondary press" style={{ flex: 1 }} onClick={() => { setPick(pending ?? current); setOpen(true); }}><span className="ph ph-swap" aria-hidden="true" />{t("changePlan")}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("chTitle")}>
        <div className="plans" role="radiogroup" aria-label={t("chTitle")}>
          {options.map((o) => {
            const on = pick === o.period;
            return (
              <button key={o.period} type="button" role="radio" aria-checked={on} className={`plan-card press${on ? " is-on" : ""}`} onClick={() => setPick(o.period)}>
                <span className="pc-top"><span className="pc-name">{o.name}</span><span className={`radio${on ? " is-on" : ""}`} aria-hidden="true"><span className="dot" /></span></span>
                <span className="price" style={{ fontSize: 22 }}><span className={moneyCls(currency)}>{o.price}</span> <small>{o.per}</small></span>
                <span className="sub">{o.period === current ? t("current") : o.sub}</span>
              </button>
            );
          })}
        </div>
        <div className="notice is-info"><span className="ph ph-calendar" aria-hidden="true" /><span className="grow"><b>{w.t}</b><span>{w.b}</span></span></div>
        {err ? <p className="err" role="alert"><span className="ph ph-x-circle-fill" aria-hidden="true" />{t("error")}</p> : null}
        <button type="button" className={`btn btn-primary btn-lg btn-block press${target && target !== pending ? "" : " is-disabled"}`} aria-disabled={!target || target === pending || busy}
          onClick={() => { if (target && target !== pending && !busy) void save(target); }}>{w.go}</button>
        {pending ? <button type="button" className="btn btn-ghost btn-block" style={{ minHeight: 44 }} onClick={() => void save(current)}>{t("chUndo")}</button>
          : <button type="button" className="btn btn-ghost btn-block" style={{ minHeight: 44 }} onClick={() => setOpen(false)}>{t("chKeep")}</button>}
      </Sheet>
    </>
  );
}

/** Ask for a refund after the 7 days: the sheet explains and points to support. */
export function RefundLate({ body, cancelS, sub, initialOpen }: { body: string; cancelS: string | null; sub: string; initialOpen?: boolean }) {
  const t = useTranslations("billing");
  const [open, setOpen] = useState(!!initialOpen);
  return (
    <>
      <button type="button" className="set-row" style={{ background: "none", inlineSize: "100%", font: "inherit", textAlign: "start", cursor: "pointer", borderInline: 0, borderBlockStart: 0 }} onClick={() => setOpen(true)}>
        <span className="ph ph-refund" aria-hidden="true" /><span className="set-l">{t("askRefund")}<small>{sub}</small></span><span className="ph ph-caret-end flip ink-3" aria-hidden="true" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("ltTitle")} titleCenter ill="/ill/uxgate-ill-mail.png">
        <p className="t-small ink-2" style={{ textAlign: "center", fontSize: 14.5 }}>{body}</p>
        <div className="why-list">
          {cancelS ? <div className="why-row"><span className="ph ph-x-circle" style={{ color: "var(--ink-2)" }} aria-hidden="true" /><span className="grow"><b>{t("ltCancelT")}</b><span>{cancelS}</span></span></div> : null}
          <div className="why-row"><span className="ph ph-mail" style={{ color: "var(--ink-2)" }} aria-hidden="true" /><span className="grow"><b>{t("ltMailT")}</b><span className="ltr" style={{ textAlign: "start" }}>support@uxgate.org</span></span></div>
        </div>
        <a href="mailto:support@uxgate.org" className="btn btn-secondary btn-block press"><span className="ph ph-mail" aria-hidden="true" />{t("ltMail")}</a>
        {cancelS ? <Link href="/app/settings/billing/cancel" className="btn btn-ghost btn-block" style={{ minHeight: 44 }}>{t("cancelPlan")}</Link> : null}
        <button type="button" className="btn btn-ghost btn-block" style={{ minHeight: 44 }} onClick={() => setOpen(false)}>{t("close")}</button>
      </Sheet>
    </>
  );
}

export { Toast };

/** Cancel: an optional reason, then Pro stays on to the end of the paid period. No retention offer. */
export function CancelForm({ reasons }: { reasons: { id: string; label: string }[] }) {
  const t = useTranslations("billing");
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true); setErr(false);
    const r = await billingPost("plan", { action: "cancel", reason });
    if (!r.ok) { setBusy(false); setErr(true); return; }
    router.push("/app/settings/billing?done=cancel");
    router.refresh();
  };
  return (
    <div className="pg-stack" style={{ gap: 10 }}>
      <p className="t-label" style={{ fontSize: 15 }} id="cx-why">{t("cxWhy")} <span className="ink-3" style={{ fontWeight: 600 }}>{t("optional")}</span></p>
      <div className="reasons" role="radiogroup" aria-labelledby="cx-why">
        {reasons.map((o) => {
          const on = reason === o.id;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} className={`radio${on ? " is-on" : ""}`} onClick={() => setReason(on ? null : o.id)}
              style={{ background: "none", borderInline: 0, borderBlockStart: 0, textAlign: "start", font: "inherit", color: "inherit" }}>
              <span className="dot" aria-hidden="true" />{o.label}
            </button>
          );
        })}
      </div>
      {err ? <p className="err" role="alert"><span className="ph ph-x-circle-fill" aria-hidden="true" />{t("error")}</p> : null}
      <button type="button" className="btn btn-primary btn-lg btn-block press" style={{ marginBlockStart: 4 }} aria-disabled={busy} onClick={go}>{busy ? <span className="spin" aria-hidden="true" /> : null}{t("cxGo")}</button>
      <Link href="/app/settings/billing" className="btn btn-ghost btn-block" style={{ minHeight: 44 }}>{t("cxKeep")}</Link>
    </div>
  );
}

/** The refund request: a few words on why, sent to the UXGate team. */
export function RefundForm({ paymentId }: { paymentId: string }) {
  const t = useTranslations("billing");
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return;
    if (!text.trim()) { setErr(t("rfErr")); return; }
    setBusy(true); setErr(null);
    const r = await billingPost("refund", { paymentId, reason: text.trim() });
    if (!r.ok) { setBusy(false); setErr(r.error === "late" ? t("ltTitle") : r.error === "asked" ? t("refundReq") : t("error")); return; }
    router.push("/app/settings/billing/requests?done=sent");
    router.refresh();
  };
  return (
    <div className="pg-stack" style={{ gap: 10 }}>
      <div className="field">
        <label htmlFor="rf-why">{t("rfWhy")}</label>
        <div className={`note-in${err ? " is-error" : ""}`}>
          <textarea id="rf-why" rows={3} maxLength={1000} value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} aria-invalid={!!err} aria-describedby={err ? "rf-err rf-help" : "rf-help"} />
        </div>
        {err ? <span className="err" id="rf-err"><span className="ph ph-x-circle-fill" aria-hidden="true" />{err}</span> : null}
        <span className="help" id="rf-help">{t("rfHelp")}</span>
      </div>
      <button type="button" className="btn btn-primary btn-lg btn-block press" aria-disabled={busy} onClick={go}>{busy ? <span className="spin" aria-hidden="true" /> : <span className="ph ph-send" aria-hidden="true" />}{t("rfGo")}</button>
      <Link href="/app/settings/billing" className="btn btn-ghost btn-block" style={{ minHeight: 44 }}>{t("back")}</Link>
    </div>
  );
}

export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="btn btn-secondary btn-block press no-print" onClick={() => window.print()}><span className="ph ph-download" aria-hidden="true" />{label}</button>;
}
