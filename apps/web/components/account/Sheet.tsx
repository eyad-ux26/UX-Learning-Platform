"use client";

import { useEffect, useRef } from "react";

/**
 * A bottom sheet on a phone and a centred dialog on a laptop. Focus moves in on open, stays inside (Tab wraps),
 * Esc and the scrim close it, and focus returns to what opened it.
 */
export function Sheet({
  titleId,
  onClose,
  children,
}: {
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = box.current;
    const focusables = () =>
      Array.from(
        el?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    (el?.querySelector<HTMLElement>("input, [data-autofocus]") ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, []);
  return (
    <>
      <div className="s4-sheet-scrim" onClick={onClose} aria-hidden="true" />
      <section ref={box} className="s4-sheet sheet-in" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="grab" aria-hidden="true" />
        {children}
      </section>
    </>
  );
}
