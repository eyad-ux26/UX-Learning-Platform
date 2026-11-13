import { NextResponse } from "next/server";
import { z } from "zod";
import { applyEvent } from "@/lib/billing/engine";
import { transactionEvent } from "@/lib/billing/paymob";
import { seal } from "@/lib/billing/crypto";
import { billingCaller, bad } from "@/lib/server/billing/route";
import { billingEngine } from "@/lib/server/billing";
import { hostOf, mockAllowed, tokenKey } from "@/lib/server/billing/config";
import { sessionFromRow } from "@/lib/server/billing/store";

const body = z.object({
  session: z.string().uuid(),
  action: z.enum(["pay", "wallet", "approve", "decline", "leave"]),
  renewals: z.enum(["ok", "decline"]).default("ok"),
});

/**
 * The test-mode provider, for test hosts only (BILLING_MOCK=1 and never a production host): it stands in for
 * Paymob and Paddle until their test keys exist. Its result goes through the same engine as a real webhook.
 */
export async function POST(req: Request) {
  if (!mockAllowed(hostOf(req))) return bad("not_found", 404);
  const who = await billingCaller(req, "mock", 20);
  if ("error" in who) return who.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const { data: row } = await who.admin
    .from("checkout_sessions")
    .select("*")
    .eq("id", parsed.data.session)
    .eq("user_id", who.user.id)
    .maybeSingle();
  if (!row || row.provider !== "mock") return bad("not_found", 404);
  const s = sessionFromRow(row);
  const engine = billingEngine();
  if (parsed.data.action === "leave") {
    if (s.status === "open" || s.status === "pending")
      await who.admin.from("checkout_sessions").update({ status: "cancelled" }).eq("id", s.id);
    return NextResponse.json({ ok: true, status: "cancelled" });
  }
  const wallet = parsed.data.action === "wallet" || parsed.data.action === "approve";
  const obj = {
    id: `mock-${s.id}`,
    amount_cents: s.amountMinor,
    currency: s.currency,
    created_at: new Date().toISOString(),
    success: parsed.data.action === "pay" || parsed.data.action === "approve",
    pending: parsed.data.action === "wallet",
    order: { id: s.id, merchant_order_id: `s_${s.id}` },
    source_data: wallet
      ? { pan: "01012344521", sub_type: "wallet", type: "wallet" }
      : { pan: "4242", sub_type: "Visa", type: "card" },
  };
  const ev = transactionEvent(obj, "mock");
  await applyEvent(engine, ev, obj);
  if (ev.type === "paid" && !wallet)
    await who.admin.from("payment_tokens").upsert(
      {
        user_id: who.user.id,
        provider: "mock",
        token: await seal(tokenKey(), parsed.data.renewals === "ok" ? "mock:ok" : "mock:decline"),
        card_brand: "Visa",
        card_last4: "4242",
        card_expiry: "08/28",
      },
      { onConflict: "user_id,provider" },
    );
  return NextResponse.json({ ok: true, status: ev.type });
}
