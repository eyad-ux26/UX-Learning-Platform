"use client";
/* eslint-disable @next/next/no-img-element */
// The Paths tab "spotlight" (design S3-18, option B): a search field, a carousel of the video courses, then every path
// in catalog order. Each card has the name and description at the start, the instructor on video courses, the tags at the
// bottom and a path illustration on the end side that the card edge crops. Search is client-side over the playable paths.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PathName } from "@/components/PathName";
import { foldSearch, searchPaths } from "@/lib/catalog-list";

export type SpotCardData = {
  id: string;
  name: string;
  sub: string;
  units: number;
  /** A video (hybrid) path: shows the instructor line and the highlight. */
  video: boolean;
  instructor: { name: string; photo: string } | null;
  /** Already on the learner's list (still searchable). */
  joined: boolean;
};

type T = ReturnType<typeof useTranslations>;

function SpotCard({ c, t, flat, hit }: { c: SpotCardData; t: T; flat?: boolean; hit?: string }) {
  const who = c.video ? c.instructor : null;
  return (
    <Link
      href={`/app/paths/${c.id}`}
      className={`path-card press pc-stack has-art${c.video ? " is-hybrid" : ""}${flat ? " hy-flat" : ""}`}
      aria-label={who ? t("videoAria", { path: c.name, name: who.name }) : c.name}
    >
      <span className="hy-top">
        <span className="pc-text">
          <span className="pc-name">
            <PathName name={c.name} />
          </span>
          <span className="pc-sub">{c.sub}</span>
        </span>
      </span>
      {who ? (
        <span className="pc-who">
          <img className="hy-avatar" src={`/instructors/${who.photo}-avatar.jpg`} alt="" width={28} height={28} />
          {t("withWho", { name: who.name })}
        </span>
      ) : null}
      <span className="pc-meta">
        <span className={c.video ? "kind kind-hybrid" : "kind"}>
          <span className={`ph ph-${c.video ? "video" : "cursor-click"}`} aria-hidden="true" />
          {c.video ? t("hybrid") : t("interactive")}
        </span>
        <span className="kind">{t("units", { count: c.units })}</span>
        {c.joined ? null : <span className="kind kind-free">{t("free1")}</span>}
        {hit ? (
          <span className="kind kind-hit">
            <span className="ph ph-magnifying-glass" aria-hidden="true" />
            {t("matches", { kw: hit })}
          </span>
        ) : null}
      </span>
      <img className="pc-art pc-art-l" src={`/ill/paths/${c.id}.svg`} alt="" aria-hidden="true" />
      <img className="pc-art pc-art-d" src={`/ill/paths/${c.id}-dark.svg`} alt="" aria-hidden="true" />
    </Link>
  );
}

export function PathSpotlight({
  cards,
  locale,
  allHeading,
}: {
  cards: SpotCardData[];
  locale: "en" | "ar";
  allHeading: "all" | "new";
}) {
  const t = useTranslations("paths");
  const [typed, setTyped] = useState("");
  const [q, setQ] = useState("");
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setTimeout(() => setQ(typed), 150);
    return () => clearTimeout(id);
  }, [typed]);

  const searching = foldSearch(q).length > 0;
  const byId = new Map(cards.map((c) => [c.id, c]));
  const results = searching
    ? searchPaths(
        q,
        locale,
        cards.map((c) => c.id),
      )
    : [];
  const featured = cards.filter((c) => c.video);
  const rest = cards.filter((c) => !c.joined);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth;
    el.scrollBy({ left: dir * (w + 12) * (document.dir === "rtl" ? -1 : 1), behavior: "smooth" }); // lint-logical-ignore: scrollBy has no logical option
  };

  return (
    <>
      <label className="input pth-search">
        <span className="ph ph-search" aria-hidden="true" />
        <input
          type="search"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={t("searchPh")}
          aria-label={t("searchLabel")}
          enterKeyHint="search"
        />
        {typed ? (
          <button
            type="button"
            className="pth-clear"
            aria-label={t("clearSearch")}
            onClick={() => {
              setTyped("");
              setQ("");
            }}
          >
            <span className="ph ph-x" aria-hidden="true" />
          </button>
        ) : null}
      </label>

      {searching ? (
        <>
          {results.length ? (
            <>
              <p className="t-over" role="status">
                {t("results", { count: results.length, q: q.trim() })}
              </p>
              <div className="pg-cards">
                {results.map((r) => (
                  <SpotCard key={r.id} c={byId.get(r.id)!} t={t} hit={r.hit} />
                ))}
              </div>
            </>
          ) : (
            <p className="t-small ink-2" role="status">
              {t("noResults", { q: q.trim() })}
            </p>
          )}
        </>
      ) : (
        <>
          {featured.length ? (
            <section className={`hy-carousel${featured.length <= 2 ? " is-few" : ""}`} aria-label={t("secFeatured")}>
              <div className="hy-bar">
                <p className="t-over hy-title">
                  <span className="ph ph-star-fill" aria-hidden="true" />
                  {t("secFeatured")}
                </p>
                {featured.length > 1 ? (
                  <span className="hy-nav">
                    <button
                      type="button"
                      className="hy-btn hy-prev"
                      aria-label={t("carPrev")}
                      onClick={() => scroll(-1)}
                    >
                      <span className="ph ph-caret-end" aria-hidden="true" />
                    </button>
                    <button type="button" className="hy-btn" aria-label={t("carNext")} onClick={() => scroll(1)}>
                      <span className="ph ph-caret-end flip" aria-hidden="true" />
                    </button>
                  </span>
                ) : null}
              </div>
              <div className="hy-track" ref={track}>
                {featured.map((c) => (
                  <SpotCard key={c.id} c={c} t={t} flat />
                ))}
              </div>
            </section>
          ) : null}
          {rest.length ? (
            <>
              <p className="t-over">{allHeading === "all" ? t("secAll") : t("secNew")}</p>
              <div className="pg-cards">
                {rest.map((c) => (
                  <SpotCard key={c.id} c={c} t={t} />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  );
}
