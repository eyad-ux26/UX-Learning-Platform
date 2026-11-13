import { PathName } from "@/components/PathName";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Profile: the learner's plan, and for a free learner the path certificate locked behind Pro. */
export async function ProfilePlan({ pro, pathTitle, pct }: { pro: boolean; pathTitle: string; pct: number }) {
  const t = await getTranslations("billing");
  return (
    <>
      <section className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        {pro ? <span className="pro-tag">PRO</span> : <span className="st st-wait">{t("freePlan")}</span>}
        <span style={{ flex: 1, minInlineSize: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="t-over">{t("yourPlan")}</span>
          <b style={{ fontSize: 16 }}>{pro ? t("proName") : t("freePlan")}</b>
        </span>
        <Link href={pro ? "/app/settings/billing" : "/app/plans"} className="btn btn-secondary btn-sm press">
          {pro ? t("planAndBilling") : t("seePlans")}
        </Link>
      </section>
      {pro ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="t-over set-sec">{t("certsTitle")}</p>
          <Link
            href="/app/profile?paywall=cert"
            scroll={false}
            className="cert-lock press"
            style={{ textDecoration: "none", color: "var(--ink)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ill/uxgate-ill-certificate.png" alt="" />
            <span className="grow">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <b style={{ textAlign: "start" }}>
                  <PathName name={pathTitle} />
                </b>
                <span className="pro-tag">PRO</span>
              </span>
              <span>{t("certNote")}</span>
              <span className="progress progress-sm" aria-hidden="true" style={{ marginBlockStart: 4 }}>
                <i style={{ inlineSize: `${pct}%` }} />
              </span>
            </span>
          </Link>
          <p className="pg-note" style={{ fontSize: 13 }}>
            <span className="ph ph-info" aria-hidden="true" />
            <span>{t("certRule")}</span>
          </p>
        </div>
      )}
    </>
  );
}
