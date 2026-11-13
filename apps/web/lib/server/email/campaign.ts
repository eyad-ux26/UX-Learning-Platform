import { emailLayout, type EmailLocale } from "./layout";
import type { EmailOut } from "./templates";

export type CampaignInput = {
  locale: EmailLocale;
  subject: string;
  /** Plain text from the panel: blank lines split paragraphs. No HTML is kept. */
  body: string;
  button?: { label: string; href: string } | null;
  unsubscribeHref: string;
};

const WHY = {
  en: "You get this because you have a UXGate account and did not turn off news emails.",
  ar: "وصلتك هذه الرسالة لأن لديك حسابًا في UXGate ولم توقف رسائل الأخبار.",
};
const KIND = { en: "news emails", ar: "رسائل الأخبار" };

/** A campaign email (COM-2) in the house layout, with the "turn off news emails" link in the footer. */
export function campaignEmail(i: CampaignInput): EmailOut {
  const paragraphs = i.body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .slice(0, 20);
  const out = emailLayout({
    locale: i.locale,
    preheader: paragraphs[0]?.slice(0, 110) ?? i.subject,
    heading: i.subject,
    paragraphs,
    button: i.button ?? undefined,
    footer: { unsubscribeHref: i.unsubscribeHref, kindLabel: KIND[i.locale] },
    why: WHY[i.locale],
    signoff: true,
  });
  return { subject: i.subject, ...out };
}
