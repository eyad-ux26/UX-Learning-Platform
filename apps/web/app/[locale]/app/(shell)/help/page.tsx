/* eslint-disable @next/next/no-img-element */
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { AccountFrame } from "@/components/account/AccountFrame";
import { PageTop } from "@/components/account/PageTop";
import { HelpFaq } from "@/components/account/HelpFaq";
import { Link } from "@/i18n/navigation";
import { requireLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "help" });
  return { title: `${t("title")} · UXGate`, robots: { index: false } };
}

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("help");
  const s = await getTranslations("settings");
  let fresh = 0;
  // Articles the team published in the admin panel's Help centre (0063), in the learner's language, after the quick answers.
  let articles: { q: string; a: string }[] = [];
  if (me.db) {
    const { data: arts } = await me.db
      .from("help_articles")
      .select("title, body, topic")
      .eq("status", "published")
      .order("topic")
      .order("published_at", { ascending: false })
      .limit(30);
    const l = locale === "ar" ? "ar" : "en";
    articles = ((arts ?? []) as { title: Record<string, string>; body: Record<string, string> }[]).map((x) => ({
      q: x.title[l],
      a: x.body[l],
    }));
  }
  if (me.db) {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { count } = await me.db
      .from("review_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", me.userId)
      .gte("replied_at", since);
    fresh = count ?? 0;
  }
  return (
    <AccountFrame me={me} locale={locale}>
      <PageTop title={t("title")} back="/app/settings" backLabel={s("back")} />
      <div className="s4-cols">
        <div className="pg-stack" style={{ gap: 12 }}>
          <section className="mail-card">
            <img src="/ill/uxgate-ill-support.png" alt="" width={64} height={64} />
            <div className="grow">
              <h2 style={{ fontSize: 17, margin: 0 }}>{t("writeUs")}</h2>
              <span className="ltr" style={{ textAlign: "start", fontWeight: 700, fontSize: 15 }}>
                support@uxgate.org
              </span>
              <span className="t-small" style={{ fontSize: 13 }}>
                {t("writeNote")}
              </span>
            </div>
          </section>
          <a href="mailto:support@uxgate.org" className="btn btn-primary btn-block press">
            <span className="ph ph-mail" aria-hidden="true" />
            {t("emailBtn")}
          </a>
          <div className="set">
            <Link href="/app/requests" className="set-row">
              <span className="ph ph-chat-text" aria-hidden="true" />
              <span className="set-l">
                {t("myRequests")}
                <small>{fresh ? t("myReqNew", { count: fresh }) : t("myReqSub")}</small>
              </span>
              {fresh ? (
                <span
                  className="badge"
                  style={{ background: "var(--brand)", color: "var(--on-brand)" }}
                  aria-hidden="true"
                >
                  {fresh}
                </span>
              ) : null}
              <span className="ph ph-caret-right flip ink-3" aria-hidden="true" />
            </Link>
            <Link href="/app/settings/notifications" className="set-row">
              <span className="ph ph-bell" aria-hidden="true" />
              <span className="set-l">{t("choices")}</span>
              <span className="ph ph-caret-right flip ink-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="pg-stack" style={{ gap: 10 }}>
          <h2 className="t-over set-sec">{t("quick")}</h2>
          <HelpFaq items={[...[1, 2, 3, 4, 5].map((n) => ({ q: t(`q${n}`), a: t(`a${n}`) })), ...articles]} />
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <Link href="/privacy" className="pg-link">
              <span className="ph ph-shield-check" aria-hidden="true" />
              {t("privacy")}
            </Link>
            <Link href="/terms" className="pg-link">
              <span className="ph ph-article" aria-hidden="true" />
              {t("terms")}
            </Link>
          </div>
        </div>
      </div>
    </AccountFrame>
  );
}
