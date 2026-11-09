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
