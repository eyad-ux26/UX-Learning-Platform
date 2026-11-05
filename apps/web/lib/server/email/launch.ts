// The launch list's confirmation email (design canvas v70, EmailPages view launchConfirm). Copy is in
// messages/s6/*.json under `launchMail`. The launch-day email (launchLive) is sent once at launch and is built then.

import en from "../../../messages/s6/en.json";
import ar from "../../../messages/s6/ar.json";
import { emailLayout, type EmailLocale } from "./layout";
import type { EmailOut } from "./templates";

export function launchConfirmEmail(i: { locale: EmailLocale; href: string }): EmailOut {
  const m = (i.locale === "ar" ? ar : en).launchMail;
  const out = emailLayout({
    locale: i.locale,
    preheader: m.preheader,
    heading: m.heading,
    paragraphs: [m.body],
    button: { label: m.button, href: i.href, showLink: true },
    notes: [m.note],
    ill: "mail",
    safety: m.safety,
    footer: "transactional",
    why: m.why,
  });
  return { subject: m.subject, ...out };
}
