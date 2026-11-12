"use client";
import { useRef } from "react";
import { Link } from "@/i18n/navigation";

export type ReviseText = {
  button: string;
  aria: string;
  over: string;
  title: string;
  body: string;
  rows: { icon: string; title: string; sub: string }[];
  /** Where a revise stopped earlier, if any ("You stopped at Lesson 3: …"). */
  resume: string | null;
  go: string;
  not: string;
};

/**
 * Revise a unit (design S3-19 frame 4, PathsPages pathUnits / pathRevise): a small Revise button on an opened unit's row
 * that opens a sheet on a phone and a dialog on a laptop, saying what revising does before it starts. A native modal
 * dialog, so focus stays inside, Esc closes it, and focus returns to the button.
 */
export function ReviseSheet({ id, href, text }: { id: string; href: string; text: ReviseText }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = `rv-${id}`;
  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm press rv-btn" aria-haspopup="dialog" aria-label={text.aria} onClick={() => ref.current?.showModal()}>
        <span className="ph ph-review" aria-hidden="true" /><span className="rv-label">{text.button}</span>
      </button>
      <dialog ref={ref} className="lk-sheet" aria-labelledby={titleId} onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }}>
        <div className="lk-in">
          <div className="grab" aria-hidden="true" />
          <button type="button" className="icon-btn plain lk-x" aria-label={text.not} onClick={() => ref.current?.close()}><span className="ph ph-x" aria-hidden="true" /></button>
          <span className="rv-ic" aria-hidden="true"><span className="ph ph-review" /></span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "center" }}>
            <span className="t-small ink-3" style={{ fontWeight: 700 }}>{text.over}</span>
            <h2 id={titleId}>{text.title}</h2>
          </div>
          <p className="t-small ink-2" style={{ textAlign: "center" }}>{text.body}</p>
          <ul className="why-list" role="list">
            {text.rows.map((r) => (
              <li key={r.title} className="why-row is-done">
                <span className={`ph ph-${r.icon}`} aria-hidden="true" />
                <span className="grow"><b>{r.title}</b><span>{r.sub}</span></span>
              </li>
            ))}
          </ul>
          {text.resume ? <p className="t-small ink-2 rv-resume"><span className="ph ph-bookmark-simple" aria-hidden="true" />{text.resume}</p> : null}
          <Link href={href} className="btn btn-primary btn-lg btn-block press"><span className="ph ph-play" aria-hidden="true" />{text.go}</Link>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => ref.current?.close()}>{text.not}</button>
        </div>
      </dialog>
    </>
  );
}
