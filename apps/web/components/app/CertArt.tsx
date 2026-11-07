/* eslint-disable @next/next/no-img-element */
import { getTranslations } from "next-intl/server";
import { certId } from "@/lib/certificate-share";

export type CertArtData = { name: string; pathName: string; shown: number; checks: number; lessons: number; issued: string; code: string; pathId: string; locale: "en" | "ar" };

/**
 * The certificate art (design S3-16): drawn at 1200 x 628, the LinkedIn link-preview size, and scaled by `--s` in CSS.
 * Always light, like paper. Phones get the same landscape layout, scaled down to fit. The og image (/c/[code]/og.png) draws the same art for LinkedIn.
 */
export async function CertArt({ d, size = "page" }: { d: CertArtData; size?: "page" | "public" | "card" }) {
  const t = await getTranslations({ locale: d.locale, namespace: "cert" });
  const body = () => (
    <article className="cx" lang={d.locale} dir={d.locale === "ar" ? "rtl" : "ltr"} aria-label={t("art")}>
      <div className="cx-band">
        <img className="cx-logo" src="/brand/logo-white.svg" alt="UXGate" />
        <span className="cx-over">{t("over")}</span>
        <img className="cx-seal" src="/ill/uxgate-ill-certificate.png" alt="" />
        <ul className="cx-stats">
          <li><b className="num">{d.shown}</b><span>{t("statShown")}</span></li>
          <li><b className="num">{d.checks}</b><span>{t("statChecks", { count: d.checks })}</span></li>
          <li><b className="num">{d.lessons}</b><span>{t("statLessons", { count: d.lessons })}</span></li>
        </ul>
      </div>
      <div className="cx-main">
        <span className="cx-lead">{t("certifies")}</span>
        <span className="cx-namebox"><i /><i /><i /><i /><span className="cx-name"><bdi>{d.name}</bdi></span></span>
        <span className="cx-lead">{t("showed")}</span>
        <span className="cx-path"><bdi>{d.pathName}</bdi></span>
        <span className="cx-how">{t("how", { count: d.checks })}</span>
        <div className="cx-foot">
          <span><small>{t("issued")}</small><b>{d.issued}</b></span>
          <span><small>{t("idLabel")}</small><b className="ltr">{certId(d.pathId, d.code)}</b></span>
          <span><small>{t("verify")}</small><b className="ltr">uxgate.org/c/{d.code}</b></span>
        </div>
      </div>
    </article>
  );
  return (
    <div className={`cx-pair is-${size}`}>
      <div className="cx-box is-land">{body()}</div>
    </div>
  );
}
