import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PathCard } from "@/components/public/PathCard";
import { PubFooter, PubHeader } from "@/components/public/PublicChrome";
import { SampleStep } from "@/components/public/SampleStep";
import {
  PUBLIC_PATHS, SITE_URL, artUrl, isOpen, pageAlternates, pathFacts, publicPathBySlug, publicPathParams, publicPathsInOrder, speakerLabel,
  type PublicPath,
} from "@/lib/public-paths";

// One static page per path and language, built at deploy. Anything not listed is a 404.
export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;

// Next calls this once per language from the [locale] layout; without a language it lists every path in both.
export function generateStaticParams({ params }: { params: { locale?: string } }) {
  const all = publicPathParams();
  return params?.locale ? all.filter((x) => x.locale === params.locale) : all;
}

type Params = { params: Promise<{ locale: string; pathId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, pathId } = await params;
  const p = publicPathBySlug(pathId);
  if (!p) return {};
  const t = await getTranslations({ locale, namespace: "pathpage" });
  const sub = p.sub[locale as Locale];
  const description = isOpen(p) ? sub : t("metaSoon", { name: p.name, sub });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("metaTitle", { name: p.name }),
    description,
    alternates: pageAlternates(locale, `/paths/${p.slug}`),
    openGraph: { title: p.name, description, images: [artUrl(p)], locale: locale === "ar" ? "ar_EG" : "en_US", type: "website" },
  };
}

export default async function PathPage({ params }: Params) {
  const { locale: l, pathId } = await params;
  setRequestLocale(l);
  const p = publicPathBySlug(pathId);
  if (!p) notFound();
  const locale = l as Locale;
  return (
    <div className="s4-pub">
      <PubHeader current="paths" />
      {isOpen(p) ? <OpenPath p={p} locale={locale} /> : <SoonPath p={p} locale={locale} />}
      <PubFooter />
    </div>
  );
}

async function OpenPath({ p, locale }: { p: PublicPath; locale: Locale }) {
  const t = await getTranslations("pathpage");
  const f = pathFacts(p, locale);
  const hyb = p.kind === "hybrid";
  const how = hyb
    ? [["ph-video", t("hHyb1")], ["ph-cursor-click", t("hHyb2")], ["ph-seal", t("hHyb3")]]
    : [["ph-cursor-click", t("hInt1")], ["ph-chat", t("hInt2")], ["ph-seal", t("hInt3")]];
  const keys = locale === "ar" ? ["أ", "ب", "ج", "د"] : ["A", "B", "C", "D"];

  return (
    <main className="pub-main">
      <section className="pp-hero pub-hero">
        <div className="pub-hero-top">
          <p className="crumb"><Link href="/paths">{t("paths")}</Link><span className="ph ph-caret flip" aria-hidden="true" /><span className="ltr">{p.name}</span></p>
          <div className="pp-facts">
            <span className={`kind${hyb ? " kind-hybrid" : ""}`}><span className={`ph ${hyb ? "ph-video" : "ph-cursor-click"}`} aria-hidden="true" />{hyb ? t("hybrid") : t("interactive")}</span>
            <span className="kind">{t("unitsN", { n: f.units })}</span>
            <span className="kind">{t("lessonsN", { n: f.lessons })}</span>
            <span className="kind">{t("skillsN", { n: f.skills })}</span>
            <span className="kind kind-free">{t("free1")}</span>
          </div>
          <h1 className="ltr pub-start">{p.name}</h1>
          <p className="lead">{p.sub[locale]}</p>
        </div>
        <div className="pp-art pub-hero-art">
          <span className="frame-label pub-art-label pub-only-desk" aria-hidden="true"><span className="ph ph-frame-corners" /><span className="ltr">{p.name}</span></span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artUrl(p)} alt="" width={300} height={300} fetchPriority="high" decoding="async" />
        </div>
        <div className="pub-hero-go">
          <div className="pp-cta">
            <Link href="/signup" className="btn btn-primary btn-lg btn-block press"><span className="ph ph-play" aria-hidden="true" />{t("startFree")}</Link>
            <a href="#sample" className="btn btn-secondary btn-lg btn-block press">{t("trySample")}</a>
          </div>
          <p className="t-small ink-2 pub-note"><span className="ph ph-clock" aria-hidden="true" />{hyb ? t("noteHyb") : t("noteInt")}</p>
        </div>
      </section>

      <section className="pp-sec" aria-labelledby="pp-can">
        <h2 id="pp-can">{t("canTitle")}</h2>
        <div className="can">
          {f.can.map((x) => <p key={x}><span className="ph ph-check-circle-fill" aria-hidden="true" /><span>{x}</span></p>)}
        </div>
      </section>

      <div className="pub-two">
        <section className="pp-sec" aria-labelledby="pp-units">
          <h2 id="pp-units">{t("unitsTitle")}</h2>
          <ol className="unit-list pub-list">
            {f.unitRows.map((u) => (
              <li key={u.n} className={`unit-row${u.free ? " is-free" : ""}`}>
                <span className="unit-n" aria-hidden="true">{u.n}</span>
                <span className="grow"><b>{u.name}</b><small>{t("unitMeta", { lessons: u.lessons, skills: u.skills })}</small></span>
                <span className={`kind${u.free ? " kind-free" : ""}`}>{u.free ? t("freeTag") : t("subTag")}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="pp-sec" id="sample" aria-labelledby="pp-sample">
          <h2 id="pp-sample">{hyb ? t("clipTitle") : t("sampleTitle")}</h2>
          {hyb && p.clip ? (
            <div className="pub-clip-wrap">
              <span className="frame-label"><span className="ph ph-frame-corners" aria-hidden="true" />{t("clipWhere", { unit: p.clip.unit, lesson: p.clip.lesson })}</span>
              <div className="pub-clip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artUrl(p)} alt="" width={160} height={160} loading="lazy" className="pub-clip-art" />
                <div className="pub-clip-copy">
                  <span className="pub-clip-over">{p.clip.over[locale]}</span>
                  <b className="pub-clip-title">{p.clip.title[locale]}</b>
                </div>
                {/* The poster only: the clip itself plays inside the lesson. */}
                <span className="btn btn-highlight pub-clip-play" aria-hidden="true" title={t("playClip")}><span className="ph ph-play-fill" /></span>
                <span className="pub-clip-cc"><span className="ph ph-cc" aria-hidden="true" /><span className="ltr">{p.clip.length} · CC English, العربية</span></span>
              </div>
              <p className="pg-note"><span className="ph ph-cursor-click" aria-hidden="true" /><span>{p.clip.after[locale]}</span></p>
            </div>
          ) : p.sample ? (
            <SampleStep
              where={t("sampleWhere", { unit: p.sample.unit, lesson: p.sample.lesson })}
              face={`/char/uxgate-char-${p.sample.speaker}-talk-avatar.svg`}
              speaker={speakerLabel(p.sample.speaker, locale)}
              scenario={p.sample.scenario[locale]}
              question={p.sample.question[locale]}
              keys={keys.slice(0, p.sample.options.length)}
              options={p.sample.options.map((o) => o[locale])}
              answer={p.sample.answer}
              why={p.sample.why[locale]}
            />
          ) : null}
        </section>
      </div>

      <section className="pp-sec" aria-labelledby="pp-how">
        <h2 id="pp-how">{hyb ? t("howHyb") : t("howInt")}</h2>
        <div className="can pub-how">
          {how.map(([icon, text]) => <p key={text}><span className={`ph ${icon}`} aria-hidden="true" /><span>{text}</span></p>)}
        </div>
      </section>

      <section className="pp-band" aria-labelledby="pp-band">
        <div className="pub-band-copy">
          <h2 id="pp-band" className="pub-band-title">{t("bandTitle")}</h2>
          <p className="pub-band-body">{t("bandBody")}</p>
        </div>
        <Link href="/signup" className="btn btn-primary btn-lg press pub-band-btn">{t("startFree")}</Link>
      </section>
    </main>
  );
}

async function SoonPath({ p, locale }: { p: PublicPath; locale: Locale }) {
  const t = await getTranslations("pathpage");
  const ready = publicPathsInOrder().filter((x) => isOpen(x));
  return (
    <main className="pub-main">
      <section className="pp-hero">
        <div className="pub-stack">
          <p className="crumb"><Link href="/paths">{t("paths")}</Link><span className="ph ph-caret flip" aria-hidden="true" /><span className="ltr">{p.name}</span></p>
          <div className="pp-facts"><span className="kind kind-soon"><span className="ph ph-hourglass" aria-hidden="true" />{t("soon")}</span></div>
          <h1 className="ltr pub-start">{p.name}</h1>
          <p className="lead">{p.sub[locale]}</p>
          <p className="pg-note pub-soon-note"><span className="ph ph-info" aria-hidden="true" /><span>{t("soonBody")}</span></p>
        </div>
        <div className="pp-art pub-soon-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artUrl(p)} alt="" width={300} height={300} fetchPriority="high" decoding="async" />
        </div>
      </section>
      <section className="pp-sec" aria-labelledby="pp-ready">
        <h2 id="pp-ready">{t("readyTitle")}</h2>
        <ul className="pg-grid pub-list pub-grid">
          {ready.map((r) => <li key={r.id}><PathCard p={r} locale={locale} open /></li>)}
        </ul>
        <div className="pp-cta pub-soon-cta">
          <Link href="/try" className="btn btn-primary btn-lg btn-block press"><span className="ph ph-play" aria-hidden="true" />{t("tryLesson")}</Link>
          <Link href="/paths" className="btn btn-secondary btn-lg btn-block press">{t("allPaths", { n: PUBLIC_PATHS.length })}</Link>
        </div>
      </section>
    </main>
  );
}
