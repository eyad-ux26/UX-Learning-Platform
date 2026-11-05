"use client";

// Last resort when the root layout itself fails: no layout, no styles and no messages are available, so this page is
// bilingual and styled inline. Logical properties only.
import { useEffect } from "react";

const wrap = { minBlockSize: "100dvh", margin: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 24, background: "#F3FAFD", color: "#012E4B", fontFamily: "system-ui, 'Segoe UI', Tahoma, sans-serif", textAlign: "center" } as const;
const block = { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxInlineSize: 420 } as const;
const h1 = { margin: 0, fontSize: 26, lineHeight: 1.25 } as const;
const p = { margin: 0, fontSize: 16, lineHeight: 1.6, color: "#3D5D73" } as const;
const btn = { minBlockSize: 48, paddingInline: 22, border: 0, borderRadius: 14, background: "#005F99", color: "#FFFFFF", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" } as const;
const link = { color: "#005F99", fontWeight: 700 } as const;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const ref = error.digest ? ` · REF ${error.digest}` : "";
  return (
    <html lang="en">
      <body style={wrap}>
        <main style={{ display: "contents" }}>
          <p style={{ ...p, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }} dir="ltr">ERROR 500{ref}</p>
          <div style={block}>
            <h1 style={h1}>Something broke on our side</h1>
            <p style={p}>It isn’t something you did. Try again in a moment. Your answers up to the last step are saved.</p>
          </div>
          <div style={block} lang="ar" dir="rtl">
            <h2 style={h1}>حدث عطل من جهتنا</h2>
            <p style={p}>ليس بسبب شيء فعلته. حاول مرة أخرى بعد لحظة. إجاباتك حتى آخر خطوة محفوظة.</p>
          </div>
          <button type="button" style={btn} onClick={() => reset()}>Try again · حاول مرة أخرى</button>
          <p style={{ ...p, fontSize: 14 }}>
            <a href="mailto:support@uxgate.org" style={link} dir="ltr">support@uxgate.org</a>
          </p>
        </main>
      </body>
    </html>
  );
}
