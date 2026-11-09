/* eslint-disable @next/next/no-img-element */
import { PathName } from "@/components/PathName";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { AccountFrame } from "@/components/account/AccountFrame";
import { PageTop } from "@/components/account/PageTop";
import { PlayOnce } from "@/components/account/PlayOnce";
import { Link } from "@/i18n/navigation";
import { requireLearner } from "@/lib/server/learner";
import { describeRequest, fixtureRequests, REQUEST_COLUMNS, type RequestRow } from "@/lib/requests";
import { pathArt } from "@/lib/path-art";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "requests" });
  return { title: `${t("ansTitle")} · UXGate`, robots: { index: false } };
}

const ST = { yes: ["st st-yes", "ph-also-fill"], wait: ["st st-wait", "ph-hourglass"], kept: ["st st-kept", "ph-check"] } as const;

export default async function RequestPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await requireLearner(locale);
  const t = await getTranslations("requests");
  const s = await getTranslations("settings");
  const f = await getFormatter();
  let row: RequestRow | undefined;
  if (me.db) {
    const { data } = await me.db.from("review_requests").select(REQUEST_COLUMNS).eq("user_id", me.userId).eq("id", id).maybeSingle();
    row = (data ?? undefined) as RequestRow | undefined;
  } else row = fixtureRequests().find((r) => r.id === id);
  if (!row) notFound();
  const v = await describeRequest(row, locale as "en" | "ar");
  const when = (iso: string) => f.dateTime(new Date(iso), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", numberingSystem: "latn" });

  return (
    <AccountFrame me={me} locale={locale}>
      {v.status === "yes" ? <PlayOnce sound="answer-also-works" /> : null}
      <PageTop title={t("ansTitle")} back="/app/requests" backLabel={s("back")} />
      <div className="s4-cols">
        <div className="pg-stack" style={{ gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="path-lbl"><img src={pathArt(v.pathId)} alt="" /><span><PathName name={v.pathTitle} /> · {t("whereLong", { unit: v.unitNo, lesson: v.lessonNo, step: v.stepNo })}</span></span>
            <span className={ST[v.status][0]}><span className={`ph ${ST[v.status][1]}`} aria-hidden="true" />{t(`st_${v.status}`)}</span>
          </div>
          <section className="snap" aria-labelledby="rq-step">
            <h2 className="t-over" id="rq-step" style={{ margin: 0 }}>{t("theStep")}</h2>
            {v.scenario ? (
              <div className="say" style={{ margin: 0 }}>
                {v.speaker ? <img className="say-face" src={`/char/uxgate-char-${v.speaker.id}-talk-avatar.svg`} alt="" style={{ inlineSize: 48, blockSize: 48 }} /> : null}
                <div className="say-bubble" style={{ padding: "6px 10px 7px" }}>
                  {v.speaker ? <span className="say-name">{v.speaker.name} · {v.speaker.role}</span> : null}
                  <p className="scn" style={{ fontSize: 14, margin: 0 }}>{v.scenario}</p>
                </div>
              </div>
            ) : null}
            {v.question ? <p style={{ margin: 0, fontWeight: 700, fontSize: 16, lineHeight: 1.35 }}>{v.question}</p> : null}
            {v.options.map((o) => (
              <div key={o.key} className={`choice${o.correct ? " is-right" : ""}${o.mine && !o.correct ? " is-selected" : ""}`}>
                <span className="key">{o.key}</span><span className="grow">{o.label}</span>
                {o.mine ? <span className="verdict" style={{ fontSize: 12, color: "var(--ink-2)" }}>{t("yourAnswer")}</span> : null}
              </div>
            ))}
          </section>
          <p className="req-why" style={{ fontSize: 14 }}><b>{t("yourReason")}</b> {t(`r_${v.reason}`)}{v.note ? <> · “{v.note}”</> : null}</p>
        </div>
        <div className="pg-stack" style={{ gap: 10 }}>
          {v.status === "wait" ? (
            <p className="pg-note"><span className="ph ph-hourglass" aria-hidden="true" /><span>{t("waiting")}</span></p>
          ) : (
            <section className="reply" aria-label={t("agent")}>
              <span className="reply-who"><span className="avatar" aria-hidden="true">U</span><span>{t("agent")}{v.repliedAt ? ` · ${when(v.repliedAt)}` : ""}</span></span>
              <p className="t-body" style={{ fontSize: 15, margin: 0 }}>{v.reply}</p>
            </section>
          )}
          {v.status === "yes" ? (
            <>
              <h2 className="t-over set-sec">{t("changed")}</h2>
              <div className="chg"><span className="chg-ic" style={{ background: "var(--mint)", color: "var(--right-ink)" }}><span className="ph ph-also-fill" aria-hidden="true" /></span><span className="grow"><span className="chg-top"><b>{t("chg1")}</b>{v.xp ? <span className="chg-v ltr">+{v.xp} XP</span> : null}</span><p>{t("chg1b")}</p></span></div>
              <div className="chg"><span className="chg-ic"><span className="ph ph-check-circle" aria-hidden="true" /></span><span className="grow"><span className="chg-top"><b>{t("chg2")}</b></span><p>{t("chg2b")}</p></span></div>
            </>
          ) : null}
          {v.status === "kept" ? <p className="pg-note"><span className="ph ph-info" aria-hidden="true" /><span>{t("keptNote")}</span></p> : null}
          <Link href={`/app/lesson/${v.lessonId}`} className="btn btn-secondary btn-block press"><span className="ph ph-replay" aria-hidden="true" />{t("seeStep")}</Link>
        </div>
      </div>
    </AccountFrame>
  );
}
