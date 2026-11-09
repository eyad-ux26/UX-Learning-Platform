"use client";

import { useId, useState } from "react";

/** Quick answers: one open at a time, each question a real button with aria-expanded. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const id = useId();
  return (
    <div className="faq">
      {items.map((it, i) => (
        <div key={i} style={{ display: "contents" }}>
          <h3 style={{ margin: 0, fontSize: "inherit" }}>
            <button type="button" className="faq-q" aria-expanded={open === i} aria-controls={`${id}-${i}`} onClick={() => setOpen(open === i ? null : i)}>
              <span className="grow">{it.q}</span><span className="ph ph-caret" style={{ transform: `rotate(${open === i ? 180 : 0}deg)` }} aria-hidden="true" />
            </button>
          </h3>
          <p className="faq-a" id={`${id}-${i}`} hidden={open !== i} style={{ whiteSpace: "pre-line" }}>{it.a}</p>
        </div>
      ))}
    </div>
  );
}
