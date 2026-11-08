import { getLocale, getTranslations } from "next-intl/server";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";
import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@uxgate/content";
import { catalogEntry } from "@/lib/catalog";
import { certStats } from "@/lib/certificate-stats";
import { certId, postText, publicUrl } from "@/lib/certificate-share";
import type { Learner } from "@/lib/server/learner";
import type { CertificateFull } from "@/lib/server/certificates";
import { ShareSwitch } from "./ShareSwitch";
import { CertArt } from "./CertArt";
import { CertActions } from "./CertActions";

/** One certificate per path (design S3-16): the art, Share on LinkedIn, Add to profile, PDF, image and link, and the certificate page switch. */
export async function CertificateMain({ me, cert }: { me: Learner; cert: CertificateFull }) {
  const t = await getTranslations("cert");
  const locale = (await getLocale()) as Locale;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "uxgate.org"}`;
  const pathName = catalogEntry(cert.pathId)?.name ?? cert.pathId;
  const s = certStats(cert.pathId);
  const name = me.progress.displayName ?? "";
  const issued = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(cert.issuedAt));
  const art = { name, pathName, shown: s.skills, checks: s.checks, lessons: s.lessons, issued, code: cert.code, pathId: cert.pathId, locale };
  // The post versions come in English first and in Arabic on request, whatever the account language is.
  const url = publicUrl(origin, locale, cert.code);
  const post = (loc: "en" | "ar") => {
    const tt = createTranslator({ locale: loc, messages: loc === "en" ? en : ar, namespace: "cert" } as never) as unknown as (k: string, v?: Record<string, unknown>) => string;
    return [1, 2, 3].map((n) => postText({ intro: tt(n === 1 ? "postIntro" : `postIntro${n}`, { path: pathName, skills: s.skills, checks: s.checks }), seeIt: tt("postSee"), tags: tt("postTags") }, url));
  };
  const posts = { en: post("en"), ar: post("ar") };
  return (
    <div className="ph-page">
      <Link href="/app/profile" className="btn btn-ghost btn-sm no-print" style={{ alignSelf: "flex-start" }}><span className="ph ph-arrow back" aria-hidden="true" />{t("back")}</Link>
      <h1 className="t-h1 h1-s no-print">{t("title")}</h1>
      <div className="cxp-split">
        <div className="cxp-art"><CertArt d={art} /></div>
        <div className="cxp-side no-print">
          <CertActions
            pathId={cert.pathId} pathName={pathName} name={name} code={cert.code} issuedAt={cert.issuedAt} id={certId(cert.pathId, cert.code)}
            skills={s.skills} checks={s.checks} initialPublic={cert.public}
            url={url} posts={posts}
            cardArt={<CertArt d={art} size="card" />}
          />
        </div>
      </div>
      <div className="no-print"><ShareSwitch initialOn={me.shareEnabled} initialHandle={me.handle} origin={origin} /></div>
    </div>
  );
}
