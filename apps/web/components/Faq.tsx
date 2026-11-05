"use client";

import { useState } from "react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {items.map((f, i) => (
        <div key={i} className="card faq-item">
          <h3 className="faq-q">
            <button type="button" aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{f.q}</span>
              <span className={`ph ph-caret faq-caret${open === i ? " is-open" : ""}`} aria-hidden="true" />
            </button>
          </h3>
          {open === i ? <p id={`faq-${i}`} className="t-small ink-2 faq-a">{f.a}</p> : null}
        </div>
      ))}
    </div>
  );
}
