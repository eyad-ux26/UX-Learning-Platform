/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@uxgate/content";
import { catalogEntry } from "@/lib/catalog";
import { pathProgressCounts } from "@/lib/certificate";
import type { Learner } from "@/lib/server/learner";
import type { Certificate } from "@/lib/server/certificates";
import { ShareSwitch } from "./ShareSwitch";
import { PrintButton } from "./PrintButton";

/** One certificate per path, framed like an artboard, with the achievement page switch beneath it. */
export async function CertificateMain({ me, cert }: { me: Learner; cert: Certificate }) {
  const t = await getTranslations("cert");
  const locale = (await getLocale()) as Locale;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "uxgate.org"}`;
  const c = pathProgressCounts(cert.pathId, (id) => me.skillStates.get(id)?.state);
  return (
    <div className="ph-page">
      <Link href="/app/profile" className="btn btn-ghost btn-sm no-print" style={{ alignSelf: "flex-start" }}><span className="ph ph-arrow back" aria-hidden="true" />{t("back")}</Link>
      <h1 className="t-h1 h1-s no-print">{t("title")}</h1>
      <section className="card cert-card" aria-label={t("title")}>
        <div className="cert-art">
          
          <img src="/ill/uxgate-ill-certificate.png" alt="" style={{ inlineSize: 72, blockSize: 72 }} />
          <p className="t-over">{t("of")}</p>
          <p className="t-small ink-2">{t("awarded")}</p>
          <p className="name">{me.progress.displayName}</p>
          <p className="t-small ink-2">{t("forPath")}</p>
          <p className="t-h2"><bdi>{catalogEntry(cert.pathId)?.name ?? cert.pathId}</bdi></p>
          <p className="t-small ink-2">{t("skills", { count: c.shown })} · {t("date", { date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(cert.issuedAt)) })}</p>
        </div>
        <PrintButton label={t("print")} />
        <p className="t-small ink-2 no-print">{t("printNote")}</p>
      </section>
      <div className="no-print"><ShareSwitch initialOn={me.shareEnabled} initialHandle={me.handle} origin={origin} /></div>
    </div>
  );
}
