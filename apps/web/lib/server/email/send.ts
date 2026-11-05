// Sends one email through Resend's HTTP API (fetch only, so it runs on Cloudflare Workers).
// Sender and reply-to are fixed by product rule. Sign-in and reset emails are not sent here: Supabase Auth sends them
// with the templates in supabase/templates. Keeping "at most one reminder email a day" is the caller's job: claim the
// day in public.email_log (its unique index covers reminder and goal) before calling sendEmail.

import "server-only";
import { unsubHref, unsubKindOf } from "../../email-token";

export const FROM = "UXGate <hello@uxgate.org>";
export const REPLY_TO = "support@uxgate.org";

/** Kinds whose emails can be turned off with one click; they carry List-Unsubscribe headers. */
export const REMINDER_KINDS = ["reminder", "goal", "review", "badge", "answer"] as const;
export type EmailKind = (typeof REMINDER_KINDS)[number] | "welcome" | "deleted" | "billing" | (string & {});

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: EmailKind;
  userId?: string;
  /** Extra headers. A List-Unsubscribe given here wins over the one made from userId. */
  headers?: Record<string, string>;
  /** Language of the turn-off page that List-Unsubscribe opens. */
  locale?: "en" | "ar";
};

export type SendEmailResult = { ok: boolean; id?: string; skipped?: boolean; error?: string };

export const isReminderKind = (kind: string) => (REMINDER_KINDS as readonly string[]).includes(kind);

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY is not set; skipped a "${input.kind}" email`);
    return { ok: false, skipped: true };
  }

  const headers: Record<string, string> = { ...(input.headers ?? {}) };
  if (isReminderKind(input.kind)) {
    const has = Object.keys(headers).some((h) => h.toLowerCase() === "list-unsubscribe");
    const k = unsubKindOf(input.kind);
    if (!has && input.userId && k) {
      try {
        headers["List-Unsubscribe"] = `<${await unsubHref(input.userId, k, input.locale ?? "en")}>`;
      } catch (e) {
        // No signing secret: send without the header rather than not at all; the footer link is the caller's.
        console.warn(`[email] no List-Unsubscribe for "${input.kind}": ${(e as Error).message}`);
      }
    }
    if (Object.keys(headers).some((h) => h.toLowerCase() === "list-unsubscribe")) headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const body = {
    from: FROM,
    to: [input.to],
    reply_to: REPLY_TO,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: Object.keys(headers).length ? headers : undefined,
    tags: [{ name: "kind", value: String(input.kind).replace(/[^A-Za-z0-9_-]/g, "_") }],
  };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      console.error(`[email] Resend refused a "${input.kind}" email: ${res.status} ${data.name ?? ""} ${data.message ?? ""}`.trim());
      return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    console.error(`[email] could not reach Resend for a "${input.kind}" email: ${(e as Error).message}`);
    return { ok: false, error: (e as Error).message };
  }
}
