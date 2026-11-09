import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ticketIdIn } from "@/lib/admin/data/support";
import { categoryOf, isAutomatic, languageOf, stripQuoted } from "@/lib/admin/inbound";

export const dynamic = "force-dynamic";

const body = z.object({
  from: z.string().email().max(254), name: z.string().max(200).nullable().default(null), subject: z.string().max(1000).default(""),
  text: z.string().max(200_000).default(""), messageId: z.string().max(500).nullable().default(null), inReplyTo: z.string().max(500).nullable().default(null),
  autoSubmitted: z.string().max(100).nullable().default(null), attachments: z.number().int().min(0).max(100).default(0),
});

/**
 * Email to support@uxgate.org, handed over by the Worker's email handler (cf-worker.ts) with the cron secret. A reply
 * with "[#1042]" in the subject from the ticket's own address joins that ticket; anything else opens a new one.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "payload" }, { status: 400 });
  const m = p.data;
  const from = m.from.toLowerCase();
  if (isAutomatic(m)) return NextResponse.json({ ok: true, skipped: "automatic" });
  const db = createAdminClient();
  if (m.messageId) {
    const { data: seen } = await db.from("support_messages").select("id").eq("kind", "inbound").eq("email_message_id", m.messageId).maybeSingle();
    if (seen) return NextResponse.json({ ok: true, duplicate: true });
  }
  const text = stripQuoted(m.text).slice(0, 20000) || "(no text)";
  const lang = languageOf(`${m.subject} ${text}`);
  const now = new Date().toISOString();
  let ticketId: number | null = null;
  const id = ticketIdIn(m.subject);
  if (id) {
    const { data: t } = await db.from("support_tickets").select("id, email, status, resolved_at").eq("id", id).maybeSingle();
    // Only the ticket's own address can add to it, and a ticket closed over 30 days ago starts a new one.
    const stale = t?.status === "closed" && t.resolved_at && Date.now() - new Date(t.resolved_at).getTime() > 30 * 86_400_000;
    if (t && t.email.toLowerCase() === from && !stale) {
      ticketId = t.id;
      await db.from("support_tickets").update({ status: "open", updated_at: now, last_message_at: now, ...(["resolved", "closed"].includes(t.status) ? { resolved_at: null } : {}) }).eq("id", t.id);
    }
  }
  if (!ticketId) {
    const subject = (m.subject.replace(/^((re|fwd?|aw|رد):\s*)+/i, "").trim() || (lang === "ar" ? "رسالة بدون عنوان" : "No subject")).slice(0, 300);
    const { data: t, error } = await db.from("support_tickets").insert({ email: from, name: m.name, subject, channel: "email", category: categoryOf(subject, text), language: lang }).select("id").single();
    if (error || !t) {
      console.error("support inbound: ticket", error?.code, error?.message);
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    ticketId = t.id;
  }
  const { error } = await db.from("support_messages").insert({ ticket_id: ticketId, kind: "inbound", from_email: from, body: text, language: lang, email_message_id: m.messageId, attachments: m.attachments });
  if (error && error.code !== "23505") {
    console.error("support inbound: message", error.code, error.message);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ticket: ticketId });
}
