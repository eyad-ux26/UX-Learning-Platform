import type { CardStep, Locale } from "@uxgate/content/types";
import type { Idea, IdeaPoint } from "./idea";
import { inline } from "./VideoSummary";

type T = (key: string, values?: Record<string, string | number>) => string;

const Tile = ({ p, n }: { p: { icon: string | null }; n: number }) => (
  <span className="lp-idea-ic" aria-hidden="true">{p.icon ? <span className={`ph ph-${p.icon}`} /> : <span className="num">{n}</span>}</span>
);
const Text = ({ p }: { p: { title: string; text: string } }) => (
  <span className="lp-idea-text">{p.title ? <b>{inline(p.title)}</b> : null}{p.text ? <span>{inline(p.text)}</span> : null}</span>
);

function Cards({ points, cls }: { points: IdeaPoint[]; cls?: string }) {
  const n = points.length;
  return (
    <ul className={`lp-idea-grid n${n}${cls ? ` ${cls}` : ""}`}>
      {points.map((p, k) => <li key={k} className="lp-idea-card"><Tile p={p} n={k + 1} /><Text p={p} /></li>)}
    </ul>
  );
}

/** A text-only idea or recap card (design S2-15): the card body drawn as an idea card, point cards, topic cards, scales, a note and a next row. */
export function IdeaCards({ step, idea, locale, t, headingRef }: {
  step: CardStep; idea: Idea; locale: Locale; t: T; headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const hid = `idea-${step.id}`;
  const hook = step.part === "hook";
  const dos = idea.points.filter((p) => !p.not), donts = idea.points.filter((p) => p.not);
  return (
    <section className="lp-idea" aria-labelledby={step.title ? hid : undefined}>
      {step.title ? <header className="lp-idea-head"><h1 ref={headingRef} tabIndex={-1} id={hid} className="t-h2">{step.title[locale]}</h1></header> : null}

      {idea.lead.length ? (
        <article className="lp-sum-key lp-idea-key">
          <span className="lp-sum-key-ic" aria-hidden="true"><span className="ph ph-lightbulb-fill" /></span>
          <div className="lp-sum-key-text">
            {hook ? null : <p className="lp-sum-key-over">{t("sumKey")}</p>}
            {idea.lead.map((p, i) => <p key={i}>{inline(p)}</p>)}
          </div>
        </article>
      ) : null}

      {idea.sides ? (
        <div className="lp-idea-vs">
          {idea.sides.map((sd, k) => (
            <section key={k} className={`lp-idea-side ${k === 0 ? "is-a" : "is-b"}`} aria-labelledby={`${hid}-s${k}`}>
              <h2 id={`${hid}-s${k}`}><Tile p={sd} n={k + 1} />{inline(sd.title)}</h2>
              <ul>{sd.items.map((x, i) => <li key={i}><span className="ph ph-check" aria-hidden="true" /><span>{inline(x)}</span></li>)}</ul>
            </section>
          ))}
          <span className="lp-idea-or" aria-hidden="true">{t("ideaOr")}</span>
        </div>
      ) : null}
      {idea.rules.map((r, k) => (
        <aside key={k} className="lp-idea-rule"><span className="lp-idea-ic" aria-hidden="true"><span className="ph ph-flag" /></span><Text p={r} /></aside>
      ))}

      {idea.points.length && idea.recap ? (
        <ol className="lp-idea-done">
          {idea.points.map((p, k) => <li key={k}><span className="lp-idea-tick" aria-hidden="true"><span className="ph ph-check" /></span><Text p={p} /></li>)}
        </ol>
      ) : idea.points.length && donts.length ? (
        <div className="lp-sum-grid is-split">
          {[{ key: "do", cls: "is-do", icon: "check-circle-fill", title: t("sumFits"), items: dos }, { key: "dont", cls: "is-dont", icon: "x-circle-fill", title: t("sumNot"), items: donts }].filter((g) => g.items.length).map((g) => (
            <section key={g.key} className={`lp-sum-group ${g.cls}`} aria-labelledby={`${hid}-${g.key}`}>
              <h2 id={`${hid}-${g.key}`}><span className={`ph ph-${g.icon}`} aria-hidden="true" />{g.title}<span className="lp-sum-count num">{g.items.length}</span></h2>
              <ul>{g.items.map((p, k) => <li key={k} className="lp-sum-card"><span className="lp-sum-ic" aria-hidden="true"><span className={`ph ph-${p.icon ?? (g.key === "do" ? "check-circle-fill" : "x-circle-fill")}`} /></span><span className="lp-sum-text">{p.title ? <b>{inline(p.title)}</b> : null}{p.text ? <span>{inline(p.text)}</span> : null}</span></li>)}</ul>
            </section>
          ))}
        </div>
      ) : idea.points.length ? <Cards points={idea.points} /> : null}

      {idea.plain.length ? <Cards points={idea.plain.map((x) => ({ title: "", text: x, not: false, icon: null }))} /> : null}

      {idea.topics.length ? (
        <div className="lp-idea-topics">
          {idea.topics.map((tp, k) => (
            <article key={k} className="lp-idea-topic" aria-labelledby={`${hid}-t${k}`}>
              <header><span className="lp-idea-n num" aria-hidden="true">{k + 1}</span><h2 id={`${hid}-t${k}`}>{inline(tp.title)}</h2>{tp.term ? <span className="lp-idea-term ltr">{tp.term}</span> : null}</header>
              {tp.text ? <p>{inline(tp.text)}</p> : null}
              {tp.items.length ? (
                <>
                  <h3><span className="ph ph-check-circle-fill" aria-hidden="true" />{t("ideaTodo")}</h3>
                  <ul>{tp.items.map((x, i) => <li key={i}><span className="ph ph-arrow flip" aria-hidden="true" /><span>{inline(x)}</span></li>)}</ul>
                </>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {idea.scales.length ? (
        <ul className="lp-idea-scales">
          {idea.scales.map((sc, k) => (
            <li key={k}>
              <span className="lp-idea-end">{sc.a}</span>
              <span className="lp-idea-track" aria-hidden="true"><i /><i /><i /><i /><i /></span>
              <span className="lp-idea-end">{sc.b}</span>
              {sc.note ? <small>{sc.note}</small> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {idea.notes.length ? (
        <aside className="lp-idea-note">
          <p className="lp-idea-note-over"><span className="ph ph-sparkle" aria-hidden="true" />{t("ideaRemember")}</p>
          {idea.notes.map((p, i) => <p key={i}>{inline(p)}</p>)}
        </aside>
      ) : null}

      {idea.next ? (
        <p className="lp-idea-next"><span className="lp-idea-next-over"><span className="ph ph-path" aria-hidden="true" />{t("ideaNext")}</span><span>{inline(idea.next)}</span></p>
      ) : null}
    </section>
  );
}
