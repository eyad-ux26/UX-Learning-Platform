"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { Link } from "@/i18n/navigation";

export type LockedUnitText = {
  unit: string;
  title: string;
  why: string;
  body: string;
  check: { title: string; sub: string; met: boolean; toGo: string | null; metLabel: string };
  sub: { title: string; sub: string };
  go: { href: string; label: string } | null;
  test: { href: string; label: string } | null;
  close: string;
};

/**
 * A locked unit on the path map (design v60, "mapLocked"): a dashed card that opens a bottom sheet on a phone and a
 * centred dialog on desktop, with what opens the unit, Continue, and the test-out link. A native modal dialog, so focus
 * stays inside, Esc closes it, and focus returns to the card.
 */
export function LockedUnitSheet({ id, text }: { id: string; text: LockedUnitText }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = `lk-${id}`;
  return (
    <>
      <button
        type="button"
        className="card lk-card press"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
      >
        <span className="lk-ico" aria-hidden="true">
          <span className="ph ph-lock-fill" />
        </span>
        <span className="grow">
          <span className="t-small ink-3" style={{ fontWeight: 700, fontSize: 12 }}>
            {text.unit}
          </span>
          <span className="t-label">{text.title}</span>
          <span className="t-small ink-2 lk-why">
            <span className="ph ph-info" aria-hidden="true" />
            {text.why}
          </span>
        </span>
      </button>
      <dialog
        ref={ref}
        className="lk-sheet"
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
      >
        <div className="lk-in">
          <div className="grab" aria-hidden="true" />
          <button
            type="button"
            className="icon-btn plain lk-x"
            aria-label={text.close}
            onClick={() => ref.current?.close()}
          >
            <span className="ph ph-x" aria-hidden="true" />
          </button>
          <img className="lk-ill" src="/ill/uxgate-ill-lock.png" alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "center" }}>
            <span className="t-small ink-3" style={{ fontWeight: 700 }}>
              {text.unit}
            </span>
            <h2 id={titleId}>{text.title}</h2>
          </div>
          <p className="t-small ink-2" style={{ textAlign: "center" }}>
            {text.body}
          </p>
          <ul className="why-list" role="list">
            <li className={`why-row ${text.check.met ? "is-done" : "is-todo"}`}>
              <span className={`ph ph-${text.check.met ? "check-circle-fill" : "seal"}`} aria-hidden="true" />
              <span className="grow">
                <b>{text.check.title}</b>
                <span>{text.check.sub}</span>
              </span>
              {text.check.met ? (
                <span className="vh">{text.check.metLabel}</span>
              ) : text.check.toGo ? (
                <span className="kind">{text.check.toGo}</span>
              ) : null}
            </li>
            {/* Only a Pro learner reaches this sheet (a free learner's Pro units open the paywall), so the plan is met. */}
            <li className="why-row is-done">
              <span className="ph ph-check-circle-fill" aria-hidden="true" />
              <span className="grow">
                <b>{text.sub.title}</b>
                <span>{text.sub.sub}</span>
              </span>
            </li>
          </ul>
          {text.go ? (
            <Link href={text.go.href} className="btn btn-primary btn-lg btn-block press">
              <span className="ph ph-play" aria-hidden="true" />
              {text.go.label}
            </Link>
          ) : null}
          {text.test ? (
            <Link href={text.test.href} className="btn btn-ghost btn-block">
              {text.test.label}
            </Link>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
