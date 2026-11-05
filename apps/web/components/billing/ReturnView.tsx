"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { intlCheckoutPath } from "@/lib/billing/pricing";

type State = "returning" | "success" | "pending" | "pendingBank" | "failed" | "cancelled" | "refused";
type Status = { status: "open" | "pending" | "paid" | "failed" | "cancelled" | "refused"; provider: string; kind: string; period: "month" | "year"; code?: string | null };

const MAX_WAIT_MS = 45_000;

/**
 * Back from the provider. The result comes from our server (the provider's webhook), never from the address bar:
 * the page asks until the checkout is paid, pending, failed or cancelled.
 */
export function ReturnView({ sessionId, fixtureState, pathHref, overlayClosed, providerName, mock }: { sessionId: string | null; fixtureState?: State; pathHref: string; overlayClosed: boolean; providerName: "paymob" | "paddle"; mock?: boolean }) {
  const t = useTranslations("billing");
  const router = useRouter();
  const [state, setState] = useState<State>(fixtureState ?? "returning");
  const [period, setPeriod] = useState<"month" | "year">("year");
  const [code, setCode] = useState<string | null>(null);
  const started = useRef(Date.now());
  const h1 = useRef<HTMLHeadingElement>(null);

  const ask = useCallback(async () => {
    if (!sessionId) return;
    started.current = Date.now();
    setState("returning");
    for (;;) {
      const res = await fetch(`/api/billing/session?id=${sessionId}`, { cache: "no-store" }).catch(() => null);
      const s = res && res.ok ? ((await res.json()) as Status) : null;
      if (s) { setPeriod(s.period); setCode(s.code ?? null); }
      if (s?.status === "paid") { setState("success"); router.refresh(); return; }
      if (s?.status === "pending") { setState("pending"); return; }
      if (s?.status === "failed") { setState("failed"); return; }
      if (s?.status === "cancelled") { setState("cancelled"); return; }
      if (s?.status === "refused") { setState("refused"); return; }
      // Paddle's overlay was closed without paying: nothing will come.
      if (overlayClosed && Date.now() - started.current > 6000) { setState("cancelled"); return; }
      if (Date.now() - started.current > MAX_WAIT_MS) { setState("pendingBank"); return; }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }, [sessionId, overlayClosed, router]);

  useEffect(() => { if (!fixtureState) void ask(); }, [ask, fixtureState]);
  // Move focus to the result so a screen reader hears it.
  useEffect(() => { if (state !== "returning") h1.current?.focus(); }, [state]);

  if (state === "returning") {
    return (
      <main className="bye" role="status" aria-live="polite">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ill/uxgate-ill-shield.png" alt="" width={140} height={140} />
        <span className="spin" style={{ color: "var(--link)", inlineSize: 28, blockSize: 28 }} aria-hidden="true" />
        <h1>{t(`prov.${providerName}.ret`)}</h1>
        <p>{t("retBody")}</p>
      </main>
    );
  }

  const key = state === "pendingBank" ? "pending" : state;
  const rows: [string, string, string | null][] = key === "success"
    ? [["ph ph-lock-open", t("res.success.r1"), t("res.success.r1s")], ["ph ph-squares-four", t("res.success.r2"), null], ["ph ph-certificate", t("res.success.r3"), t("res.success.r3s")]]
    : key === "pending" ? [["ph ph-check-circle-fill", t("res.pending.r1"), t("res.pending.r1s")], ["ph ph-book", t("res.pending.r2"), t("res.pending.r2s")]]
    : key === "failed" ? [["ph ph-credit-card", t("res.failed.r1"), t("res.failed.r1s")], ["ph ph-globe", t("res.failed.r2"), t("res.failed.r2s")], ["ph ph-wallet", t("res.failed.r3"), null]]
    : key === "refused" ? [["ph ph-arrow-counter-clockwise", t("res.refused.r1"), t("res.refused.r1s")], ["ph ph-globe", t("res.refused.r2"), t("res.refused.r2s")]]
    : [["ph ph-check-circle-fill", t("res.cancelled.r1"), null], ["ph ph-check-circle-fill", t("res.cancelled.r2"), null]];
  const ill = key === "success" ? "/ill/uxgate-ill-trophy.png" : key === "pending" ? "/ill/uxgate-ill-target.png" : key === "failed" || key === "refused" ? "/ill/uxgate-ill-error.png" : "/ill/uxgate-ill-gate.png";
  const go = key === "success" ? <Link href={pathHref} className="btn btn-primary btn-lg btn-block press">{t("res.success.go")}</Link>
    : key === "pending" ? <button type="button" className="btn btn-primary btn-lg btn-block press" onClick={() => void ask()}>{t("res.pending.go")}</button>
    : key === "failed" ? <Link href={`/app/checkout?period=${period}`} className="btn btn-primary btn-lg btn-block press">{t("res.failed.go")}</Link>
    : key === "refused" ? <Link href={intlCheckoutPath(period, code)} className="btn btn-primary btn-lg btn-block press">{t("res.refused.go")}</Link>
    : <Link href="/app/plans" className="btn btn-primary btn-lg btn-block press">{t("res.cancelled.go")}</Link>;
  const alt = key === "success" ? <Link href="/app/settings/billing" className="btn btn-ghost btn-block">{t("res.success.alt")}</Link>
    : key === "pending" ? <Link href={pathHref} className="btn btn-ghost btn-block">{t("res.pending.alt")}</Link>
    : key === "failed" ? <Link href="/app/plans" className="btn btn-ghost btn-block">{t("res.failed.alt")}</Link>
    : key === "refused" ? <Link href="/app/plans" className="btn btn-ghost btn-block">{t("res.refused.alt")}</Link>
    : <Link href={pathHref} className="btn btn-ghost btn-block">{t("res.cancelled.alt")}</Link>;
  return (
    <main className="bye">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={key === "success" ? "pop" : undefined} src={ill} alt="" width={140} height={140} />
      <h1 ref={h1} tabIndex={-1} style={{ outline: "none" }}>{state === "pendingBank" ? t("res.pending.titleBank") : t(`res.${key}.title`)}</h1>
      <p>{state === "pendingBank" ? t("res.pending.bodyBank") : t(`res.${key}.body`)}</p>
      <section className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <p className="t-over">{t(`res.${key}.listT`)}</p>
        {rows.map(([icon, title, sub]) => (
          <div key={title} className="why-row" style={{ border: 0, padding: 0, minHeight: 0 }}><span className={icon} aria-hidden="true" /><span className="grow"><b>{title}</b>{sub ? <span>{sub}</span> : null}</span></div>
        ))}
      </section>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, inlineSize: "100%", maxInlineSize: 360 }}>
        {go}{alt}
        {mock && key === "pending" && sessionId ? <Link href={`/app/checkout/mock?session=${sessionId}`} className="btn btn-secondary btn-block">{t("mock.approve")}</Link> : null}
      </div>
      {key === "failed" || key === "pending" ? <p className="t-small" style={{ fontSize: 13 }}>{t("stuck")} <a href="mailto:support@uxgate.org" className="ltr hit" style={{ fontWeight: 700 }}>support@uxgate.org</a></p> : null}
    </main>
  );
}
