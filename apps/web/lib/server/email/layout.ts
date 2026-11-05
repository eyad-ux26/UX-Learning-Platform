// One layout for every email the app sends itself (canvas v63, EmailPages). Email-safe on purpose: a single 600px table
// column, inline styles, solid colours, the button ledge drawn as a bottom border, absolute image addresses and no web
// fonts required. Direction comes from dir="rtl" on the tables, so no left/right is ever written here.
// The subscriptions slice reuses emailLayout with this same signature; the extra fields are optional.

import en from "../../../messages/s4/emails.en.json";
import ar from "../../../messages/s4/emails.ar.json";
import { siteOrigin } from "../../email-token";

export type EmailLocale = "en" | "ar";
export type EmailLink = { label: string; href: string };

export type EmailLayoutInput = {
  locale: EmailLocale;
  /** Hidden preview line shown after the subject in the inbox. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  /** showLink prints the address under the button as copyable text. Every button that signs in sets it. */
  button?: { label: string; href: string; showLink?: boolean };
  /** Label and value lines under the paragraphs (receipts: plan, amount, card, next charge). Slice 5. */
  table?: Array<[string, string]>;
  /** img: an illustration name ("path-forms"), a site path ("/ill/x.png") or an absolute https address. */
  box?: { title: string; body: string; img?: string };
  /** "transactional": about the account or payments, always arrives. Otherwise the footer carries a "turn off" link (kindLabel is its text). */
  footer: "transactional" | { unsubscribeHref: string; kindLabel: string };
  /** Illustration at the top of the card, same forms as box.img. */
  ill?: string;
  illAlt?: string;
  /** Small grey lines under the button. When the button shows its link, the address comes after these. */
  notes?: string[];
  /** "Didn't ask for this?" line, last in the card. */
  safety?: string;
  /** First footer line: why this email arrives. Defaults to the account line for transactional emails. */
  why?: string;
  /** Footer links. "unsubscribe" marks where the turn-off link goes; it is added at the end when missing. */
  links?: Array<EmailLink | "unsubscribe">;
  /** Adds "The UXGate team" under the notes. */
  signoff?: boolean;
};

const C = {
  bg: "#EEF6F9",
  card: "#FFFFFF",
  cardLine: "#D3E8F0",
  ink: "#012E4B",
  muted: "#3D5D73",
  btn: "#005F99",
  btnInk: "#FFFFFF",
  btnLedge: "#003F66",
  box: "#D8F4FB",
  foot: "#4B555E",
  link: "#005F99",
};

const FONT = {
  en: "'Titillium Web', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  ar: "Cairo, Tahoma, 'Segoe UI', 'Geeza Pro', 'Noto Sans Arabic', Arial, sans-serif",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace";

export { siteOrigin };

/** Escapes text for HTML content and attribute values. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only web and mail addresses may be linked; anything else becomes the site home. */
export function safeHref(href: string): string {
  const h = String(href ?? "").trim();
  if (/^(https?:\/\/|mailto:)/i.test(h)) return h;
  if (h.startsWith("/") && !h.startsWith("//")) return `${siteOrigin()}${h}`;
  return siteOrigin();
}

/** Absolute address of an image: a name like "flame" means /ill/uxgate-ill-flame.png. */
export function imageUrl(img: string): string {
  if (/^https:\/\//i.test(img)) return img;
  if (img.startsWith("/") && !img.startsWith("//")) return `${siteOrigin()}${img}`;
  return `${siteOrigin()}/ill/uxgate-ill-${img.replace(/[^a-z0-9-]/gi, "")}.png`;
}

const DARK_CSS = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .em-bg { background: #00121B !important; }
  .em-card { background: #032E3B !important; border-color: #1A4F63 !important; color: #EAF7FC !important; }
  .em-card h1, .em-card p, .em-ink { color: #EAF7FC !important; }
  .em-card .em-muted, .em-code { color: #BBD9E6 !important; }
  .em-box { background: #08384A !important; }
  .em-box td { color: #EAF7FC !important; }
  .em-btn { background: #4CC3E8 !important; color: #00121B !important; border-bottom-color: #1E7FA6 !important; }
  .em-word { color: #EAF7FC !important; }
  .em-foot, .em-foot span { color: #C3CCD2 !important; }
  .em-foot a { color: #4CC3E8 !important; }
}`;

export function emailLayout(input: EmailLayoutInput): { html: string; text: string } {
  const { locale, preheader, heading, paragraphs, table = [], button, box, footer, ill, illAlt = "", notes = [], safety, signoff } = input;
  const m = (locale === "ar" ? ar : en).emails.common;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const font = FONT[locale];
  const lh = locale === "ar" ? "1.8" : "1.6";
  const unsub = footer === "transactional" ? null : { label: footer.kindLabel, href: footer.unsubscribeHref };
  const why = input.why ?? (footer === "transactional" ? m.whyAccount : "");

  const links: EmailLink[] = [];
  for (const l of input.links ?? []) {
    if (l === "unsubscribe") { if (unsub) links.push(unsub); }
    else links.push(l);
  }
  if (unsub && !links.includes(unsub)) links.push(unsub);

  const block = (html: string, first = false) => `<tr><td style="padding:${first ? "0" : "14px"} 0 0 0;">${html}</td></tr>`;
  const pStyle = `margin:0;font-size:16px;line-height:${lh};color:${C.ink};font-family:${font};`;
  const mutedStyle = `margin:0;font-size:14px;line-height:${lh};color:${C.muted};font-family:${font};`;

  const rows: string[] = [];
  if (ill) rows.push(block(`<img class="em-ill" src="${esc(imageUrl(ill))}" width="96" height="96" alt="${esc(illAlt)}" style="display:block;width:96px;height:96px;border:0;outline:none;">`, true));
  rows.push(block(`<h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:${C.ink};font-family:${font};">${esc(heading)}</h1>`, rows.length === 0));
  for (const p of paragraphs) rows.push(block(`<p style="${pStyle}">${esc(p)}</p>`));
  if (table.length) {
    const cell = `padding:9px 0;border-bottom:1px solid ${C.cardLine};font-size:14px;line-height:1.4;font-family:${font};`;
    rows.push(block(
      `<table role="presentation" class="em-rows" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:100%;border-top:1px solid ${C.cardLine};">` +
        table.map(([k, v]) => `<tr><td style="${cell}color:${C.muted};">${esc(k)}</td><td style="${cell}color:${C.ink};font-weight:700;text-align:end;">${esc(v)}</td></tr>`).join("") +
        `</table>`,
    ));
  }
  if (box) {
    const img = box.img
      ? `<td width="56" valign="middle" style="width:56px;padding:0;"><img src="${esc(imageUrl(box.img))}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border:0;"></td><td width="14" style="width:14px;font-size:0;line-height:0;">&nbsp;</td>`
      : "";
    const body = box.body ? `<br><span style="font-size:14px;line-height:1.5;color:${C.ink};font-family:${font};">${esc(box.body)}</span>` : "";
    rows.push(block(
      `<table role="presentation" class="em-box" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:100%;background:${C.box};border-radius:12px;border-collapse:separate;">` +
        `<tr><td style="padding:14px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="${dir}"><tr>${img}` +
        `<td valign="middle" style="color:${C.ink};font-family:${font};"><b style="font-size:16px;line-height:1.35;color:${C.ink};">${esc(box.title)}</b>${body}</td>` +
        `</tr></table></td></tr></table>`,
    ));
  }
  if (button) {
    const href = safeHref(button.href);
    rows.push(block(
      `<a class="em-btn" href="${esc(href)}" style="display:inline-block;padding:14px 26px;border-radius:14px;background:${C.btn};color:${C.btnInk};border-bottom:4px solid ${C.btnLedge};font-weight:700;font-size:17px;line-height:1.2;text-decoration:none;text-align:center;font-family:${font};">${esc(button.label)}</a>`,
    ));
  }
  for (const n of notes) rows.push(block(`<p class="em-muted" style="${mutedStyle}">${esc(n)}</p>`));
  if (button?.showLink) {
    const href = safeHref(button.href);
    rows.push(block(`<p class="em-code" dir="ltr" style="margin:0;font-family:${MONO};font-size:13px;line-height:1.5;color:${C.muted};word-break:break-all;"><a href="${esc(href)}" style="color:${C.muted};text-decoration:underline;">${esc(href)}</a></p>`));
  }
  if (signoff) rows.push(block(`<p class="em-muted" style="${mutedStyle}">${esc(m.team)}</p>`));
  if (safety) rows.push(block(`<p class="em-muted" style="${mutedStyle}">${esc(safety)}</p>`));

  const footStyle = `font-size:12.5px;line-height:1.6;color:${C.foot};font-family:${font};`;
  const footLines: string[] = [];
  if (why) footLines.push(`<span style="${footStyle}">${esc(why)}</span>`);
  if (links.length) {
    footLines.push(links.map((l) => `<a href="${esc(safeHref(l.href))}" style="color:${C.link};font-weight:700;text-decoration:underline;">${esc(l.label)}</a>`).join(`<span style="${footStyle}"> · </span>`));
  }
  footLines.push(`<span style="${footStyle}">${esc(m.addr)}</span>`);

  // Preheader: the hidden text, then spacers so the inbox does not fill the preview with the body.
  const pre = `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheader)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>`;

  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(heading)}</title>
<style>${DARK_CSS}</style>
</head>
<body class="em-bg" dir="${dir}" style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;">
${pre}
<table role="presentation" class="em-bg" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:100%;background:${C.bg};">
<tr><td align="center" style="padding:16px 12px 24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:100%;max-width:600px;">
<tr><td style="padding:14px 20px;"><a href="${esc(siteOrigin())}" class="em-word" style="font-family:${FONT.en};font-size:24px;font-weight:700;letter-spacing:-0.01em;color:${C.ink};text-decoration:none;" dir="ltr">UXGate</a></td></tr>
<tr><td class="em-card" dir="${dir}" style="background:${C.card};border:1px solid ${C.cardLine};border-radius:16px;padding:24px 22px;color:${C.ink};font-family:${font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:100%;">
${rows.join("\n")}
</table>
</td></tr>
<tr><td class="em-foot" dir="${dir}" style="padding:18px 20px 4px 20px;${footStyle}">
${footLines.map((l, i) => `<div style="margin:${i ? "6px" : "0"} 0 0 0;">${l}</div>`).join("\n")}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const t: string[] = [heading, ""];
  for (const p of paragraphs) t.push(p, "");
  if (table.length) t.push(...table.map(([k, v]) => `${k}: ${v}`), "");
  if (box) t.push(box.title, ...(box.body ? [box.body] : []), "");
  if (button) t.push(`${button.label}: ${safeHref(button.href)}`, "");
  for (const n of notes) t.push(n);
  if (button?.showLink) t.push(safeHref(button.href));
  if (notes.length || button?.showLink) t.push("");
  if (signoff) t.push(m.team, "");
  if (safety) t.push(safety, "");
  t.push("--");
  if (why) t.push(why);
  for (const l of links) t.push(`${l.label}: ${safeHref(l.href)}`);
  t.push(m.addr);
  return { html, text: t.join("\n") };
}
