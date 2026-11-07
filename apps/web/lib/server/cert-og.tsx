import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { certId } from "@/lib/certificate-share";
import { bidiLines } from "@/lib/cert-bidi";

export type OgCert = { name: string; pathName: string; shown: number; checks: number; lessons: number; issued: string; code: string; pathId: string; locale: "en" | "ar" };

/** Satori has no bidi: each Arabic line is built in visual order as one text node (lib/cert-bidi.ts), so word spacing stays even. */
function Txt({ text, ar, style, max = 700 }: { text: string; ar: boolean; style: Record<string, string | number>; max?: number }) {
  if (!ar) return <div style={{ display: "flex", ...style }}>{text}</div>;
  const size = typeof style.fontSize === "number" ? style.fontSize : 16;
  const lines = bidiLines(text, size, typeof style.maxWidth === "number" ? style.maxWidth : max);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", ...style }}>
      {lines.map((l, i) => <div key={i} style={{ display: "flex", whiteSpace: "nowrap" }}>{l}</div>)}
    </div>
  );
}

const get = async (origin: string, path: string) => (await fetch(`${origin}${path}`)).arrayBuffer();

/**
 * The certificate as a 1200 x 628 PNG (the LinkedIn link-preview size), drawn with next/og from the same parts as the page art
 * (components/app/CertArt.tsx). Fonts are the app's own (Cairo, Titillium Web), read from /og so Arabic and Latin both draw.
 */
export async function renderCertPng(c: OgCert, origin: string, scale = 1): Promise<ImageResponse> {
  const t = await getTranslations({ locale: c.locale, namespace: "cert" });
  const ar = c.locale === "ar";
  const [a7, a8, l7, l8, tt, logo, seal] = await Promise.all([
    get(origin, "/og/cairo-arabic-700-normal.woff"), get(origin, "/og/cairo-arabic-800-normal.woff"),
    get(origin, "/og/cairo-latin-700-normal.woff"), get(origin, "/og/cairo-latin-800-normal.woff"),
    get(origin, "/og/titillium-web-latin-700-normal.woff"), get(origin, "/brand/logo-white.svg"), get(origin, "/ill/uxgate-ill-certificate.png"),
  ]);
  const b64 = (b: ArrayBuffer) => Buffer.from(b).toString("base64");
  const font = ar ? "Cairo" : "Titillium Web";
  const blue = "#0D8BD1", ink = "#012E4B", soft = "#3D5D73";
  const handle = (pos: Record<string, number>) => <div style={{ position: "absolute", width: 10, height: 10, background: "#fff", border: `2px solid ${blue}`, ...pos }} />;
  const stat = (n: number, label: string) => (
    <div style={{ display: "flex", flexDirection: ar ? "row-reverse" : "row", alignItems: "baseline", justifyContent: ar ? "flex-end" : "flex-start", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.18)", width: "100%" }}>
      <div style={{ display: "flex", width: 56, fontSize: 28, fontWeight: 800, color: "#fff", justifyContent: ar ? "flex-end" : "flex-start" }}>{n}</div>
      <Txt ar={ar} text={label} style={{ fontSize: 16, color: "#CBEFFA", margin: "0 10px" }} />
    </div>
  );
  const foot = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", }}>
      <Txt ar={ar} text={label} style={{ fontSize: 13, color: "#6B8A9C" }} />
      <Txt ar={ar} text={value} style={{ fontSize: 16, fontWeight: 700, color: ink }} />
    </div>
  );
  const bar = { position: "absolute", top: 0, bottom: 0, width: 8, ...(ar ? { left: 0 } : { right: 0 }), background: "linear-gradient(180deg, #78E4FC, #2BB5D9)" } as const; // lint-logical-ignore: Satori has no logical properties
  return new ImageResponse(
    (
      <div style={{ width: 1200 * scale, height: 628 * scale, display: "flex" }}>
      <div style={{ width: 1200, height: 628, display: "flex", flexDirection: ar ? "row-reverse" : "row", background: "#fff", color: ink, fontFamily: font, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div style={{ width: 340, display: "flex", flexDirection: "column", alignItems: ar ? "flex-end" : "flex-start", padding: "44px 40px", background: "linear-gradient(160deg, #034A73 0%, #012E4B 70%)", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/svg+xml;base64,${b64(logo)}`} width={152} height={40} alt="" />
          <Txt ar={ar} text={t("over")} style={{ marginTop: 28, fontSize: ar ? 20 : 15, fontWeight: 800, letterSpacing: ar ? 0 : 2, color: "#78E4FC", textTransform: ar ? "none" : "uppercase" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${b64(seal)}`} width={104} height={104} alt="" style={{ marginTop: 20 }} />
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", width: "100%", gap: 10 }}>
            {stat(c.shown, t("statShown"))}
            {stat(c.checks, t("statChecks", { count: c.checks }))}
            {stat(c.lessons, t("statLessons", { count: c.lessons }))}
          </div>
          <div style={bar} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: ar ? "flex-end" : "flex-start", padding: "56px 64px 40px" }}>
          <Txt ar={ar} text={t("certifies")} style={{ fontSize: 18, color: soft }} />
          <div style={{ display: "flex", position: "relative", margin: "14px 0 16px", padding: "6px 14px", border: `2px solid ${blue}` }}>
            {handle({ top: -7, left: -7 })}{handle({ top: -7, right: -7 })}{handle({ bottom: -7, left: -7 })}{handle({ bottom: -7, right: -7 })}{/* lint-logical-ignore: Satori has no logical properties */}
            <Txt ar={ar} text={c.name} style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.15, color: ink }} />
          </div>
          <Txt ar={ar} text={t("showed")} style={{ fontSize: 18, color: soft }} />
          <Txt ar={ar} text={c.pathName} style={{ marginTop: 6, fontSize: 38, fontWeight: 800, lineHeight: 1.2, color: "#005F99" }} />
          <Txt ar={ar} text={t("how", { count: c.checks })} style={{ marginTop: 10, maxWidth: 620, fontSize: 18, lineHeight: 1.5, color: soft }} />
          <div style={{ display: "flex", flexDirection: ar ? "row-reverse" : "row", marginTop: "auto", paddingTop: 18, borderTop: "2px solid #E3EEF3", width: "100%", gap: 36 }}>
            {foot(t("issued"), c.issued)}{foot(t("idLabel"), certId(c.pathId, c.code))}{foot(t("verify"), `uxgate.org/c/${c.code}`)}
          </div>
        </div>
      </div>
      </div>
    ),
    {
      width: 1200 * scale, height: 628 * scale,
      fonts: [
        { name: "Cairo", data: a7, weight: 700, style: "normal" }, { name: "Cairo", data: a8, weight: 800, style: "normal" },
        { name: "Cairo", data: l7, weight: 700, style: "normal" }, { name: "Cairo", data: l8, weight: 800, style: "normal" },
        { name: "Titillium Web", data: tt, weight: 700, style: "normal" }, { name: "Titillium Web", data: tt, weight: 800, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    },
  );
}
