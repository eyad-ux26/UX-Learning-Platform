// 404 for addresses outside /en and /ar that the middleware does not send to a language (for example a file that does not
// exist). There is no root layout, so this page brings its own <html> and inline styles, and offers both languages.
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "404 · UXGate", robots: { index: false } };

const wrap = {
  minBlockSize: "100dvh",
  margin: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 24,
  padding: 24,
  background: "#F3FAFD",
  color: "#012E4B",
  fontFamily: "system-ui, 'Segoe UI', Tahoma, sans-serif",
  textAlign: "center",
} as const;
const block = { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxInlineSize: 420 } as const;
const h = { margin: 0, fontSize: 26, lineHeight: 1.25 } as const;
const p = { margin: 0, fontSize: 16, lineHeight: 1.6, color: "#3D5D73" } as const;
const btn = {
  display: "inline-flex",
  alignItems: "center",
  minBlockSize: 48,
  paddingInline: 22,
  borderRadius: 14,
  background: "#005F99",
  color: "#FFFFFF",
  fontSize: 17,
  fontWeight: 700,
  textDecoration: "none",
} as const;

export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={wrap}>
        <main style={{ display: "contents" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ill/uxgate-ill-search.png" alt="" width={150} height={150} />
          <p style={{ ...p, fontSize: 13, fontWeight: 700 }} dir="ltr">
            404
          </p>
          <div style={block}>
            <h1 style={h}>We can’t find that page</h1>
            <p style={p}>The link may be old or mistyped. Your paths and progress are where you left them.</p>
            <Link href="/en" style={btn} hrefLang="en">
              Go to Home
            </Link>
          </div>
          <div style={block} lang="ar" dir="rtl">
            <h2 style={h}>لم نجد هذه الصفحة</h2>
            <p style={p}>ربما الرابط قديم أو مكتوب بشكل خاطئ. مساراتك وتقدّمك كما تركتها.</p>
            <Link href="/ar" style={btn} hrefLang="ar">
              اذهب إلى الرئيسية
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
