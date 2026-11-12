import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOUNCE_KINDS, verifyResend } from "@/lib/server/email/resend-webhook";

export const dynamic = "force-dynamic";

/**
 * Resend tells us when an email bounced, was marked as spam or was not sent because the address is on its suppression
 * list. Each address is recorded once per event (migration 0066), so Team and roles can show that an invite never
 * arrived. Other event types are acknowledged and ignored.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await req.text();
  const v = await verifyResend(body, { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") }, secret);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: v.reason === "signature" ? 401 : 400 });
  const kind = BOUNCE_KINDS[v.event.type as keyof typeof BOUNCE_KINDS];
  if (!kind || !v.event.to.length) return NextResponse.json({ ok: true, ignored: v.event.type });
  const rows = v.event.to.map((email) => ({ email, kind, detail: v.event.detail, resend_id: v.event.emailId, event_id: v.event.id }));
  // A retried delivery has the same svix-id: the unique (event_id, email) keeps it once.
  const { error } = await createAdminClient().from("email_bounces").upsert(rows, { onConflict: "event_id,email", ignoreDuplicates: true });
  if (error) {
    console.error("resend webhook", v.event.id, error.code, error.message);
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, recorded: rows.length });
}
