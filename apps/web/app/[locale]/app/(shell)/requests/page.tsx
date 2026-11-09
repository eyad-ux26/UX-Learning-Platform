/* eslint-disable @next/next/no-img-element */
import { PathName } from "@/components/PathName";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { AccountFrame } from "@/components/account/AccountFrame";
import { PageTop } from "@/components/account/PageTop";
import { Link } from "@/i18n/navigation";
import { requireLearner } from "@/lib/server/learner";
import { describeRequest, fixtureRequests, REQUEST_COLUMNS, type RequestRow } from "@/lib/requests";
import { pathArt } from "@/lib/path-art";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "requests" });
  return { title: `${t("title")} · UXGate`, robots: { index: false } };
}

const ST = { yes: ["st st-yes", "ph-also-fill"], wait: ["st st-wait", "ph-hourglass"], kept: ["st st-kept", "ph-check"] } as const;

export default async function RequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("requests");
  const s = await getTranslations("settings");
  const f = await getFormatter();
  let rows: RequestRow[] = fixtureRequests();
  if (me.db) {
    const { data } = await me.db.from("review_requests").select(REQUEST_COLUMNS).eq("user_id", me.userId).order("created_at", { ascending: false }).limit(100);
    rows = (data ?? []) as RequestRow[];
  }
  const views = await Promise.all(rows.map((r) => describeRequest(r, locale as "en" | "ar")));
  const day = (iso: string) => f.dateTime(new Date(iso), { day: "numeric", month: "short", numberingSystem: "latn" });
  return (
    <AccountFrame me={me} locale={locale}>
      <PageTop title={t("title")} back="/app/help" backLabel={s("back")} />
      <div className="s4-split">
        <div className="pg-stack" style={{ gap: 10 }}>
          <p className="t-body ink-2" style={{ fontSize: 15, margin: 0 }}>{t("lead")}</p>
          {views.length === 0 ? (
            <section className="empty">
              <img src="/ill/uxgate-ill-feedback.png" alt="" width={120} height={120} />
              <h2>{t("emptyTitle")}</h2>
              <p>{t("emptyBody")}</p>
            </section>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {views.map((v) => (
                <li key={v.id}>
                  <Link href={`/app/requests/${v.id}`} className={`req${v.isNew ? " is-new" : ""}`}>
                    <span className="req-top"><span className="grow">
                      <span className="path-lbl"><img src={pathArt(v.pathId)} alt="" /><span><PathName name={v.pathTitle} /> · {t("where", { unit: v.unitNo, step: v.stepNo })}</span></span>
                      <b>{v.question || v.lessonId}</b>
                    </span></span>
                    <p className="req-why"><b>{t("yourReason")}</b> {t(`r_${v.reason}`)}</p>
                    <span className="inb-meta" style={{ flexWrap: "wrap" }}>
                      <span className={ST[v.status][0]}><span className={`ph ${ST[v.status][1]}`} aria-hidden="true" />{t(`st_${v.status}`)}</span>
                      <span>{v.repliedAt ? t("answered", { date: day(v.repliedAt) }) : t("sent", { date: day(v.createdAt) })}</span>
                      {v.isNew ? <span className="to">{t("readAnswer")}<span className="ph ph-caret-right flip" style={{ fontSize: 12 }} aria-hidden="true" /></span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="pg-stack s4-only-desk" style={{ flexDirection: "column" }}>
          <section className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="t-over" style={{ margin: 0 }}>{t("howTitle")}</h2>
            {[["ph-flag", "h1"], ["ph-user", "h2"], ["ph-also-fill", "h3"], ["ph-bell", "h4"]].map(([icon, k]) => <p key={k} className="pg-note" style={{ fontSize: 14 }}><span className={`ph ${icon}`} aria-hidden="true" /><span>{t(k)}</span></p>)}
          </section>
        </aside>
      </div>
    </AccountFrame>
  );
}
