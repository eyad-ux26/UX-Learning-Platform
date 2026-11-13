"use client";

import { useEffect, useState } from "react";

/** A short confirmation after an action. It stays a few seconds and is read out by screen readers. */
export function Toast({ text }: { text: string | null }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    setShown(text);
    if (!text) return;
    const t = setTimeout(() => setShown(null), 5000);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {shown ? (
        <div className="toast pop">
          <span className="ph ph-check-circle-fill" aria-hidden="true" />
          <span style={{ flex: 1 }}>{shown}</span>
        </div>
      ) : null}
    </div>
  );
}
