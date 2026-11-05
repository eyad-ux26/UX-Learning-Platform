// Sends each billing email once, in the learner's language. The transport (Resend, or a fake in tests) is passed in.
import type { BillingMailer, BillingStore } from "./engine";
import { renderEmail, type Email } from "./emails";

export type Transport = (msg: { to: string; subject: string; html: string; text: string }) => Promise<{ id: string | null } | null>;

export function makeMailer(store: BillingStore, transport: Transport | null, site: string): BillingMailer {
  return async (userId, kind, ref, data) => {
    const who = await store.learner(userId);
    if (!who?.email) return;
    if (!(await store.claimEmail(userId, kind, ref, who.locale, who.email))) return; // sent before
    let mail: Email;
    try {
      mail = renderEmail(kind, { locale: who.locale, site, name: who.name, ...data });
    } catch (err) {
      await store.markEmail(userId, kind, ref, "failed", null);
      console.error(`billing email ${kind} could not be built`, err);
      return;
    }
    if (!transport) {
      await store.markEmail(userId, kind, ref, "skipped", null); // no email provider set up yet
      return;
    }
    try {
      const r = await transport({ to: who.email, subject: mail.subject, html: mail.html, text: mail.text });
      await store.markEmail(userId, kind, ref, r ? "sent" : "failed", r?.id ?? null);
    } catch (err) {
      await store.markEmail(userId, kind, ref, "failed", null);
      console.error(`billing email ${kind} failed`, err);
    }
  };
}
