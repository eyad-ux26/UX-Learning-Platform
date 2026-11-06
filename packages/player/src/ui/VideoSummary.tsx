import type { CardStep, Locale } from "@uxgate/content/types";
import type { ReactNode } from "react";
import icons from "../summary-icons.json";

/** The concept-card icon names the content uses (from the unit preview), as Phosphor icons. */
export const SUMMARY_ICONS: Record<string, string> = icons;

export type SummaryPoint = { title: string; text: string; not: boolean; icon: string };
export type Summary = { intro: string[]; points: SummaryPoint[] };

const NOT = (s: string) => /^not\b/i.test(s) || /^لا\s/.test(s);
const POINT = /^\*\*(.+?)\*\*\s*(.*)$/;

function pointsOf(body: string) {
  const intro: string[] = [];
  const pts: { title: string; text: string }[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => l.startsWith("- "))) {
      for (const l of lines) {
        const m = POINT.exec(l.slice(2).trim());
        if (!m) { pts.push({ title: "", text: l.slice(2).trim() }); continue; }
        // "**Title:** text", "**Title**: text" or "**Title** text that continues the sentence".
        const title = m[1].replace(/[:：]\s*$/, "").trim();
        let text = m[2].replace(/^[:،,]\s*/, "").trim();
        if (/^[a-z]/.test(text)) text = text[0].toUpperCase() + text.slice(1);
        pts.push({ title, text });
      }
    } else intro.push(block.trim());
  }
  return { intro, pts };
}

/** Reads a video summary card: the intro paragraph, then "- **Title:** text" points. Points whose title starts with
 *  "Not" / «لا» are the "doesn't fit" ones (decided on the English text, so both languages group alike). */
export function readSummary(step: CardStep, locale: Locale): Summary | null {
  if (!step.body) return null;
  const { intro, pts } = pointsOf(step.body[locale] ?? step.body.en);
  if (pts.length < 2) return null;
  const en = locale === "en" ? pts : pointsOf(step.body.en).pts;
  const notOf = (k: number) => (en.length === pts.length ? NOT(en[k].title || en[k].text) : NOT(pts[k].title || pts[k].text));
  return {
    intro,
    points: pts.map((p, k) => {
      const not = notOf(k);
      const given = step.icons?.[k];
      const icon = given ? SUMMARY_ICONS[given] ?? given : not ? "x-circle-fill" : "check-circle-fill";
      return { ...p, not, icon };
    }),
  };
}

const inline = (s: string): ReactNode[] =>
  s.split(/(\*\*.+?\*\*|\*[^*\s][^*]*?\*)/g).map((part, i) =>
    part.startsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part.length > 2 && part.startsWith("*") && part.endsWith("*") ? <i key={i}>{part.slice(1, -1)}</i> : part,
  );

type T = (key: string, values?: Record<string, string | number>) => string;

/** The video summary page (design S2-14): the key idea, then one card per point, grouped into when it fits and when it doesn't. */
export function VideoSummary({ step, summary, locale, t, clipLength, onReplay, headingRef }: {
  step: CardStep; summary: Summary; locale: Locale; t: T; clipLength?: number; onReplay?: () => void; headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const dos = summary.points.filter((p) => !p.not);
  const donts = summary.points.filter((p) => p.not);
  const groups = donts.length
    ? [{ key: "do", cls: "is-do", icon: "check-circle-fill", title: t("sumFits"), items: dos }, { key: "dont", cls: "is-dont", icon: "x-circle-fill", title: t("sumNot"), items: donts }]
    : [{ key: "pts", cls: "is-points", icon: "list", title: t("sumPoints"), items: dos }];
  const len = clipLength ? `${Math.floor(clipLength / 60)}:${String(Math.round(clipLength % 60)).padStart(2, "0")}` : null;
  const hid = `sum-${step.id}`;
  return (
    <section className="lp-sum" aria-labelledby={hid}>
      <header className="lp-sum-head">
        <h1 ref={headingRef} tabIndex={-1} id={hid} className="t-h2">{step.title?.[locale] ?? t("sumTitle")}</h1>
        {onReplay ? (
          <button type="button" className="btn btn-secondary btn-sm press lp-sum-replay" onClick={onReplay}>
            <span className="ph ph-arrow-counter-clockwise" aria-hidden="true" />{t("sumReplay")}{len ? <span className="num ltr">{len}</span> : null}
          </button>
        ) : null}
      </header>
      {summary.intro.length ? (
        <article className="lp-sum-key">
          <span className="lp-sum-key-ic" aria-hidden="true"><span className="ph ph-lightbulb-fill" /></span>
          <div className="lp-sum-key-text">
            <p className="lp-sum-key-over">{t("sumKey")}</p>
            {summary.intro.map((p, i) => <p key={i}>{inline(p)}</p>)}
          </div>
        </article>
      ) : null}
      <div className={`lp-sum-grid${donts.length ? " is-split" : ""}`}>
        {groups.map((g) => (
          <section key={g.key} className={`lp-sum-group ${g.cls}`} aria-labelledby={`${hid}-${g.key}`}>
            <h2 id={`${hid}-${g.key}`}><span className={`ph ph-${g.icon}`} aria-hidden="true" />{g.title}<span className="lp-sum-count num">{g.items.length}</span></h2>
            <ul>
              {g.items.map((p, k) => (
                <li key={k} className="lp-sum-card">
                  <span className="lp-sum-ic" aria-hidden="true"><span className={`ph ph-${p.icon}`} /></span>
                  <span className="lp-sum-text">{p.title ? <b>{inline(p.title)}</b> : null}{p.text ? <span>{inline(p.text)}</span> : null}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
