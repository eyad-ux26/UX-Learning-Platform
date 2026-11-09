import "server-only";
// Support tickets (SUP-1 to SUP-8): replies go out from support@uxgate.org in the UXGate template, in English or
// Arabic; the learner's answer comes back to support@ and joins the same ticket by the [#1042] in the subject.
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, SUPPORT_FROM } from "@/lib/server/email/send";
import { emailLayout, siteOrigin } from "@/lib/server/email/layout";
import { AdminError, audit, check, type AdminCtx } from "../guard";
import { newToken, sha256Hex } from "../tokens";

export type TicketStatus = "new" | "open" | "waiting_learner" | "waiting_team" | "resolved" | "closed";
export type Ticket = {
  id: number; user_id: string | null; email: string; name: string | null; subject: string; channel: string; category: string; priority: string;
  status: TicketStatus; assignee_id: string | null; tags: string[]; language: "en" | "ar"; link_type: string | null; link_id: string | null;
  created_at: string; updated_at: string; last_message_at: string; first_reply_due: string | null; resolve_due: string | null;
  first_replied_at: string | null; resolved_at: string | null; satisfaction: string | null; satisfaction_comment: string | null;
  /** Email whose sender domain did not verify it (DKIM, SPF, DMARC): not linked to a learner, never joined to a ticket. */
  sender_unverified?: boolean;
};
export type Message = {
  id: string; ticket_id: number; kind: "inbound" | "reply" | "note" | "event"; author_id: string | null; from_email: string | null; body: string;
  language: string | null; mentions: string[]; delivery: string | null; attachments: number; created_at: string;
};

export const TICKET_COLS = "id, user_id, email, name, subject, channel, category, priority, status, assignee_id, tags, language, link_type, link_id, created_at, updated_at, last_message_at, first_reply_due, resolve_due, first_replied_at, resolved_at, satisfaction, satisfaction_comment, sender_unverified";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  new: "New", open: "Open", waiting_learner: "Waiting on learner", waiting_team: "Waiting on team", resolved: "Resolved", closed: "Closed",
};
export const CATEGORY_LABEL: Record<string, string> = {
  account: "Account and sign-in", billing: "Billing", content: "Content mistake", technical: "Technical", certificate: "Certificate", idea: "Feature idea", other: "Other",
};
export const CHANNEL_LABEL: Record<string, string> = {
  email: "Email", form: "Contact form", lesson_report: "Lesson report", refund: "Refund request", appeal: "Appeal", system: "System",
};

/** The open ticket for a record (a refund request, a lesson report), if one was made for it. */
export async function ticketFor(linkType: string, linkId: string): Promise<{ id: number } | null> {
  const { data } = await createAdminClient().from("support_tickets").select("id").eq("link_type", linkType).eq("link_id", linkId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

/** Fills {first_name} {plan} {renewal_date} {agent_name} in a macro for one learner. Unknown placeholders stay. */
export function fillPlaceholders(text: string, v: { first_name?: string | null; plan?: string | null; renewal_date?: string | null; agent_name?: string | null }): string {
  return text.replace(/\{(first_name|plan|renewal_date|agent_name)\}/g, (m, k: keyof typeof v) => (v[k] ? String(v[k]) : m));
}

export const subjectWithId = (subject: string, id: number) => (/\[#\d+\]/.test(subject) ? subject : `${subject} [#${id}]`);
/** The ticket number in a subject like "Re: Sign-in link [#1042]". */
export const ticketIdIn = (subject: string): number | null => {
  const m = subject.match(/\[#(\d{4,9})\]/);
  return m ? Number(m[1]) : null;
};

function replyEmail(body: string, lang: "en" | "ar", ticketId: number) {
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return emailLayout({
    locale: lang, preheader: paragraphs[0]?.slice(0, 120) ?? "", heading: lang === "ar" ? `ردّ من دعم UXGate (#${ticketId})` : `A reply from UXGate support (#${ticketId})`,
    paragraphs, footer: "transactional",
    notes: [lang === "ar" ? "للرد، أجب على هذه الرسالة مباشرة." : "To answer, reply to this email."],
  });
}

/** Sends a reply to the learner and adds it to the ticket. A failed send is kept on the ticket, marked failed. */
export async function replyOnTicket(ctx: AdminCtx, ticketId: number, body: string, opts: { status?: TicketStatus; language?: "en" | "ar" } = {}): Promise<{ delivered: boolean }> {
  const db = createAdminClient();
  const t = check(await db.from("support_tickets").select(TICKET_COLS).eq("id", ticketId).maybeSingle()) as Ticket | null;
  if (!t) throw new AdminError("invalid", "That ticket was not found.");
  const lang = opts.language ?? t.language;
  const l = replyEmail(body, lang, t.id);
  const sent = await sendEmail({ to: t.email, subject: subjectWithId(`Re: ${t.subject}`, t.id), html: l.html, text: l.text, kind: "support", from: SUPPORT_FROM, userId: t.user_id ?? undefined });
  const now = new Date().toISOString();
  check(await db.from("support_messages").insert({
    ticket_id: t.id, kind: "reply", author_id: ctx.userId, body, language: lang, email_message_id: sent.id ?? null, delivery: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed",
  }));
  const status = opts.status ?? "waiting_learner";
  const patch: Record<string, unknown> = { status, updated_at: now, last_message_at: now };
  if (!t.first_replied_at) patch.first_replied_at = now;
  if (status === "resolved" && t.status !== "resolved") patch.resolved_at = now;
  check(await db.from("support_tickets").update(patch).eq("id", t.id));
  await audit(ctx, "support.replied", "support", { type: "ticket", id: String(t.id), label: t.subject }, { after: { status, language: lang, delivery: sent.ok ? "sent" : "not sent" } });
  if (status === "resolved" && t.status !== "resolved") await sendSurvey(t.id).catch((e) => console.error("support survey", (e as Error).message));
  return { delivered: sent.ok };
}

/** Changes status, priority, category, assignee or tags. Each change is an event on the ticket and an audit entry. */
export async function updateTicket(ctx: AdminCtx, ticketId: number, patch: Partial<Pick<Ticket, "status" | "priority" | "category" | "assignee_id" | "tags" | "language">>): Promise<void> {
  const db = createAdminClient();
  const t = check(await db.from("support_tickets").select(TICKET_COLS).eq("id", ticketId).maybeSingle()) as Ticket | null;
  if (!t) throw new AdminError("invalid", "That ticket was not found.");
  const now = new Date().toISOString();
  const changes: string[] = [];
  const before: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const old = (t as Record<string, unknown>)[k];
    if (JSON.stringify(old) === JSON.stringify(v)) continue;
    before[k] = old;
    changes.push(k === "status" ? `Status: ${STATUS_LABEL[v as TicketStatus]}` : k === "assignee_id" ? (v ? "Assigned" : "Unassigned") : `${k[0]!.toUpperCase()}${k.slice(1)}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  }
  if (!changes.length) return;
  const row: Record<string, unknown> = { ...patch, updated_at: now };
  if (patch.status === "resolved" && t.status !== "resolved") row.resolved_at = now;
  if (patch.status && !["resolved", "closed"].includes(patch.status)) row.resolved_at = null;
  check(await db.from("support_tickets").update(row).eq("id", t.id));
  await db.from("support_messages").insert({ ticket_id: t.id, kind: "event", author_id: ctx.userId, body: `${changes.join(" · ")} · by ${ctx.name}` });
  await audit(ctx, "support.ticket_changed", "support", { type: "ticket", id: String(t.id), label: t.subject }, { before, after: patch });
  if (patch.status === "resolved" && t.status !== "resolved") await sendSurvey(t.id).catch((e) => console.error("support survey", (e as Error).message));
}

/** The one-question rating email (SUP-8), once per ticket, in the ticket's language. */
export async function sendSurvey(ticketId: number): Promise<void> {
  const db = createAdminClient();
  const { data: cfg } = await db.from("support_settings").select("survey, survey_text").eq("id", 1).maybeSingle();
  if (!cfg?.survey) return;
  const { data: t } = await db.from("support_tickets").select("id, email, language, user_id, satisfaction_token_hash, channel").eq("id", ticketId).maybeSingle();
  if (!t || t.satisfaction_token_hash || t.channel === "system") return;
  const token = newToken();
  const { data: claimed } = await db.from("support_tickets").update({ satisfaction_token_hash: await sha256Hex(token) }).eq("id", t.id).is("satisfaction_token_hash", null).select("id");
  if (!claimed?.length) return;
  const ar = t.language === "ar";
  const q = (cfg.survey_text as { en?: string; ar?: string } | null)?.[ar ? "ar" : "en"] ?? (ar ? "كيف كانت مساعدتنا؟" : "How was our help?");
  const base = `${siteOrigin()}/${ar ? "ar" : "en"}/rate/${token}`;
  const l = emailLayout({
    locale: ar ? "ar" : "en", preheader: q, heading: q,
    paragraphs: [ar ? `أغلقنا طلبك رقم ${t.id}. اختر إجابة واحدة، وتستطيع إضافة تعليق بعدها.` : `We closed your request #${t.id}. Pick one answer; you can add a comment after.`],
    button: { label: ar ? "جيدة" : "Good", href: `${base}?v=good` },
    notes: [ar ? `غير جيدة؟ أخبرنا: ${base}?v=bad` : `Not good? Tell us: ${base}?v=bad`],
    footer: "transactional",
  });
  await sendEmail({ to: t.email, subject: ar ? `كيف كانت مساعدتنا؟ [#${t.id}]` : `How was our help? [#${t.id}]`, html: l.html, text: l.text, kind: "support_survey", from: SUPPORT_FROM, userId: t.user_id ?? undefined });
}

/** Sends a learner a fresh sign-in link that works in any browser (support action "Resend sign-in link"). */
export async function sendSignInLink(ctx: AdminCtx, userId: string): Promise<{ email: string }> {
  const db = createAdminClient();
  const { data: u } = await db.auth.admin.getUserById(userId);
  const email = u?.user?.email;
  if (!email) throw new AdminError("invalid", "This learner has no email address.");
  const { data: prof } = await db.from("profiles").select("locale, display_name").eq("user_id", userId).maybeSingle();
  const ar = prof?.locale === "ar";
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data?.properties?.hashed_token) throw new AdminError("failed", "Supabase did not make a sign-in link. Try again in a minute.");
  const href = `${siteOrigin()}/api/auth/callback?token_hash=${data.properties.hashed_token}&locale=${ar ? "ar" : "en"}&next=/app`;
  const l = emailLayout({
    locale: ar ? "ar" : "en", preheader: ar ? "رابط دخول جديد من فريق الدعم" : "A new sign-in link from our support team",
    heading: ar ? "رابط الدخول إلى UXGate" : "Your UXGate sign-in link",
    paragraphs: [ar ? "طلب فريق الدعم رابط دخول جديدًا لك. اضغط الزر للدخول. يعمل الرابط مرة واحدة ولمدة ساعة." : "Our support team sent you a new sign-in link. Tap the button to sign in. It works once, for one hour."],
    button: { label: ar ? "ادخل إلى UXGate" : "Sign in to UXGate", href, showLink: true },
    safety: ar ? "لم تطلب هذا؟ تجاهل الرسالة، فلن يتغير شيء في حسابك." : "Didn't ask for this? Ignore this email; nothing changes in your account.",
    footer: "transactional",
  });
  const sent = await sendEmail({ to: email, subject: ar ? "رابط الدخول إلى UXGate" : "Your UXGate sign-in link", html: l.html, text: l.text, kind: "support_signin", userId });
  await audit(ctx, "learners.signin_link_sent", "learners", { type: "learner", id: userId, label: email }, { after: { delivery: sent.ok ? "sent" : "not sent" } });
  if (!sent.ok) throw new AdminError("failed", sent.skipped ? "Email is not set up on this server (no RESEND_API_KEY), so nothing was sent." : "The email did not go out. Try again.");
  return { email };
}
