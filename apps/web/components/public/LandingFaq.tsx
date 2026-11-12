"use client";

import { useId, useState } from "react";

/** Landing questions. One item open at a time, the first starts open. The answer stays in the DOM so it can animate (grid rows 0fr to 1fr). */
export function LandingFaq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  const uid = useId();
  return (
    <div className="acc is-lg">
      {items.map((f, i) => {
        const on = open === i;
        return (
          <div key={i} className={`acc-item${on ? " is-open" : ""}`}>
            <h3 className="acc-q">
              <button type="button" className="acc-btn" aria-expanded={on} aria-controls={`${uid}-${i}`} onClick={() => setOpen(on ? -1 : i)}>
                <span>{f.q}</span>
                <span className="acc-ic" aria-hidden="true"><span className="ph ph-caret-down" /></span>
              </button>
            </h3>
            <div id={`${uid}-${i}`} className="acc-panel" inert={!on}>
              <div><p className="acc-a">{f.a}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
