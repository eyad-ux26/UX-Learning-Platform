import { NextResponse } from "next/server";
import { z } from "zod";
import { refundWindow } from "@/lib/billing/subscription";
import { billingCaller, bad } from "@/lib/server/billing/route";
import { resendTransport } from "@/lib/server/billing";
import { paymentFromRow, requestFromRow } from "@/lib/server/billing/store";
import { renderEmail } from "@/lib/billing/emails";
import { siteUrl, SUPPORT_EMAIL } from "@/lib/server/billing/config";

const body = z.object({ paymentId: z.string().uuid(), reason: z.string().trim().min(1).max(1000) });

/**
 * A refund request, within 7 days of a charge, once per charge. It is stored (My requests shows it) and sent to
 * support@uxgate.org; the team answers within 2 working days. Pro ends only when the refund is made (webhook).
 */
export async function POST(req: Request) {
  const who = await billingCaller(req, "refund", 5);
  if ("error" in who) return who.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("reason_required");
  const { data: row } = await who.admin
    .from("payments")
    .select("*")
    .eq("id", parsed.data.paymentId)
    .eq("user_id", who.user.id)
    .maybeSingle();
  if (!row) return bad("not_found", 404);
  const pay = paymentFromRow(row);
  const { data: existing } = await who.admin
    .from("refund_requests")
    .select("id")
    .eq("payment_id", pay.id)
    .maybeSingle();
  const w = refundWindow(pay, !!existing);
  if (!w.ok) return NextResponse.json({ ok: false, error: w.reason, until: w.until }, { status: 409 });
  const { data: created, error } = await who.admin
    .from("refund_requests")
    .insert({
      user_id: who.user.id,
      payment_id: pay.id,
      amount_minor: pay.amountMinor,
      currency: pay.currency,
      reason: parsed.data.reason,
    })
    .select("*")
    .single();
  if (error || !created)
    return bad(error?.code === "23505" ? "asked" : "save_failed", error?.code === "23505" ? 409 : 500);
  const request = requestFromRow(created);
  // Tell support. The learner sees the request in My requests at once; their answer email comes with the decision.
  const transport = resendTransport();
  if (transport) {
    const m = renderEmail("refundAsked", {
      locale: "en",
      site: siteUrl(),
      name: null,
      payment: pay,
      request,
      extra: { email: who.user.email ?? "" },
    });
    await transport({ to: SUPPORT_EMAIL, subject: m.subject, html: m.html, text: m.text }).catch((err) =>
      console.error("refund request email", err),
    );
  }
  return NextResponse.json({ ok: true, id: request.id });
}
