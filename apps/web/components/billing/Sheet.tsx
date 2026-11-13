"use client";

import { useEffect, useId, useRef } from "react";

/**
 * A bottom sheet on a phone and a centred dialog on a laptop. It is a native <dialog> opened with showModal(), so
 * focus stays inside, the page behind is inert, and Esc closes it. The title gives the dialog its name.
 */
export function Sheet({
  open,
  onClose,
  title,
  titleCenter,
  children,
  ill,
  over,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleCenter?: boolean;
  ill?: string;
  over?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Start reading at the title, not at the first button (which could be a choice the learner did not make).
      d.querySelector<HTMLElement>("h2")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="pg-over sheet-in"
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open ? (
        <>
          <div className="grab" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {ill ? <img className="pg-over-ill" src={ill} alt="" /> : null}
          {over ? (
            <p className="t-small ink-3" style={{ fontWeight: 700, marginBlockEnd: -8 }}>
              {over}
            </p>
          ) : null}
          <h2 id={id} tabIndex={-1} style={{ outline: "none", ...(titleCenter ? { textAlign: "center" } : {}) }}>
            {title}
          </h2>
          {children}
        </>
      ) : null}
    </dialog>
  );
}
