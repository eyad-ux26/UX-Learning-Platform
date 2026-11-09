// Turning an email to support@uxgate.org into a ticket message (SUP-1). Pure parts, tested on their own.

export type Inbound = {
  from: string; name: string | null; subject: string; text: string; messageId: string | null; inReplyTo: string | null;
  autoSubmitted: string | null; attachments: number;
};

/** Automatic mail (bounces, out-of-office, mailing lists) never opens a ticket. */
export function isAutomatic(m: Pick<Inbound, "from" | "autoSubmitted" | "subject">): boolean {
  if (m.autoSubmitted && m.autoSubmitted.toLowerCase() !== "no") return true;
  if (/^(mailer-daemon|postmaster|no-?reply|bounce)/i.test(m.from)) return true;
  if (/@uxgate\.org$/i.test(m.from)) return true; // our own mail coming back
  return /^(auto(matic)? reply|out of (the )?office|delivery status notification|undeliverable)/i.test(m.subject.trim());
}

/** Arabic when most letters are Arabic. */
export function languageOf(text: string): "en" | "ar" {
  const ar = (text.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return ar > latin ? "ar" : "en";
}

const CATS: [string, RegExp][] = [
  ["billing", /refund|charge|payment|invoice|receipt|subscription|card|paid|استرداد|دفع|اشتراك|فاتورة|بطاقة/i],
  ["account", /sign[ -]?in|log[ -]?in|password|link|account|email|تسجيل|الدخول|كلمة المرور|حساب|رابط/i],
  ["certificate", /certificate|شهادة/i],
  ["content", /lesson|question|answer|mistake|درس|سؤال|إجابة|خطأ/i],
  ["technical", /bug|error|crash|slow|not work|doesn.t work|عطل|مشكلة|لا يعمل|بطيء/i],
];
/** A first guess at the category from the subject and the start of the text; the agent can change it. */
export function categoryOf(subject: string, text: string): string {
  const s = `${subject}\n${text.slice(0, 600)}`;
  return CATS.find(([, re]) => re.test(s))?.[0] ?? "other";
}

/** The new part of a reply: drops quoted lines and everything after "On ... wrote:". */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const l of lines) {
    if (/^(On .+ wrote:|في .+ كتب.*:|-----Original Message-----|________________________________)\s*$/i.test(l.trim())) break;
    if (/^\s*>/.test(l)) continue;
    out.push(l);
  }
  const t = out.join("\n").trim();
  return t || text.trim();
}

/** The mail server whose results we trust: Cloudflare Email Routing, which receives mail for uxgate.org. */
export const TRUSTED_AUTHSERV = "mx.cloudflare.net";

/**
 * The authentication results Cloudflare wrote for this email, or null. Headers come top to bottom. Only an
 * Authentication-Results or ARC-Authentication-Results header whose authserv-id (the first token; after "i=N;" in ARC)
 * is mx.cloudflare.net counts, and the topmost such header wins. Every other one may have been written by the sender,
 * so a message without a Cloudflare header is unverified.
 */
export function trustedAuthResults(headers: { key: string; value: string }[] | null | undefined): string | null {
  for (const h of headers ?? []) {
    const key = h.key.toLowerCase();
    if (key !== "authentication-results" && key !== "arc-authentication-results") continue;
    let v = h.value.replace(/\s+/g, " ").trim();
    if (key === "arc-authentication-results") v = v.replace(/^i\s*=\s*\d+\s*;\s*/i, "");
    const id = v.split(";")[0].trim().split(/\s+/)[0]?.toLowerCase();
    if (id === TRUSTED_AUTHSERV) return v.slice(0, 2000);
  }
  return null;
}

/**
 * Did the sender's domain vouch for this email? Read from the results Cloudflare wrote (see trustedAuthResults; this
 * also refuses any string whose authserv-id is not Cloudflare's). DMARC pass for the From domain, or a DKIM or SPF pass
 * for the From address's own domain, counts. Anything else (no header, fail, softfail, another domain) is unverified.
 */
export function senderVerified(authResults: string | null | undefined, from: string): boolean {
  if (!authResults) return false;
  if (authResults.split(";")[0].trim().split(/\s+/)[0]?.toLowerCase() !== TRUSTED_AUTHSERV) return false;
  const domain = from.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  const aligned = (d: string | undefined) => !!d && (domain === d.toLowerCase() || domain.endsWith(`.${d.toLowerCase()}`));
  for (const part of authResults.split(";").map((p) => p.trim().toLowerCase())) {
    if (/^dmarc=pass\b/.test(part)) {
      const d = /header\.from=([a-z0-9.-]+)/.exec(part)?.[1];
      if (aligned(d)) return true;
    }
    if (/^dkim=pass\b/.test(part) && aligned(/header\.d=([a-z0-9.-]+)/.exec(part)?.[1])) return true;
    if (/^spf=pass\b/.test(part)) {
      const mf = /smtp\.mailfrom=([^\s;]+)/.exec(part)?.[1];
      if (aligned(mf?.includes("@") ? mf.split("@")[1] : mf)) return true;
    }
  }
  return false;
}
