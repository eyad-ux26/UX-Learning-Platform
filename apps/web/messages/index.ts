// UI strings in English and Arabic, one JSON file per area. Every file adds whole namespaces and no namespace is in two
// files (tests/messages.test.ts checks it), so the files are simply put side by side.
//
//   app.json      the learner app, the lesson player, the landing page and sign-in
//   account.json  settings, notifications, inbox, help, "my requests", team tools
//   public.json   public path pages, legal pages, system pages, Coming Soon, pricing
//   emails.json   the emails the app sends itself (read directly by lib/server/email, not through next-intl)
//   billing.json  plans, checkout, receipts, refunds
//
// A new string goes in the file that already holds its namespace, in both languages.
import enApp from "./en/app.json";
import enAccount from "./en/account.json";
import enPublic from "./en/public.json";
import enEmails from "./en/emails.json";
import enBilling from "./en/billing.json";
import arApp from "./ar/app.json";
import arAccount from "./ar/account.json";
import arPublic from "./ar/public.json";
import arEmails from "./ar/emails.json";
import arBilling from "./ar/billing.json";

export const messageFiles = {
  en: { app: enApp, account: enAccount, public: enPublic, emails: enEmails, billing: enBilling },
  ar: { app: arApp, account: arAccount, public: arPublic, emails: arEmails, billing: arBilling },
} as const;

/** Every string of one language. */
export const messages = {
  en: { ...enApp, ...enAccount, ...enPublic, ...enEmails, ...enBilling },
  ar: { ...arApp, ...arAccount, ...arPublic, ...arEmails, ...arBilling },
} as const;
