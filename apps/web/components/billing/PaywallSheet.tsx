"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Sheet } from "./Sheet";
import { FreeProList } from "./FreeProList";

export type PayPrices = { month: string; year: string };

/** The paywall: a page opens it when the address has ?paywall=<unit id> (a locked unit) or ?paywall=cert (a locked certificate). */
export function PaywallSheet({ kind, over, unitN, prices }: { kind: "unit" | "cert"; over?: string; unitN?: number; prices: PayPrices }) {
  const t = useTranslations("billing");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [period, setPeriod] = useState<"month" | "year">("year");
  const close = () => {
    setOpen(false);
    // Drop ?paywall= so a reload does not open it again.
    router.replace(pathname, { scroll: false });
  };
  const title = kind === "unit" ? t("pwUnitTitle", { n: unitN ?? 2 }) : t("pwCertTitle");
  return (
      <Sheet open={open} onClose={close} title={title} over={kind === "unit" ? over : t("pwCertOver")}>
        <p className="t-small ink-2" style={{ fontSize: 14.5 }}>{kind === "unit" ? t("pwUnitBody") : t("pwCertBody")}</p>
        <FreeProList />
        <div className="tabs" role="radiogroup" aria-label={t("billingPeriod")}>
          {(["month", "year"] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={period === p} className={`tab${period === p ? " is-on" : ""}`} onClick={() => setPeriod(p)}>
              {p === "month" ? t("monthly") : t("annual")}
            </button>
          ))}
        </div>
        <Link href={`/app/checkout?period=${period}`} className="btn btn-primary btn-lg btn-block press">
          {period === "month" ? t("payCtaM", { x: prices.month }) : t("payCtaY", { x: prices.year })}
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/app/plans" className="btn btn-ghost" style={{ flex: 1, minHeight: 44, padding: "0 8px" }}>{t("planDetails")}</Link>
          <button type="button" className="btn btn-ghost" style={{ flex: 1, minHeight: 44, padding: "0 8px" }} onClick={close}>{t("notNow")}</button>
        </div>
        <div className="facts inline">
          <p><span className="ph ph-sync" aria-hidden="true" />{t("factsShort.cancel")}</p>
          <p><span className="ph ph-refund" aria-hidden="true" />{t("factsShort.refund")}</p>
        </div>
      </Sheet>
  );
}
