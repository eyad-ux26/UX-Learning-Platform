import { NextResponse } from "next/server";
import { runDaily } from "@/lib/billing/daily";
import { safeEqual, unseal } from "@/lib/billing/crypto";
import { transactionEvent } from "@/lib/billing/paymob";
import { billingEngine } from "@/lib/server/billing";
import { tokenKey } from "@/lib/server/billing/config";
import { chargeToken } from "@/lib/server/billing/paymob-api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Sub } from "@/lib/billing/subscription";
import { jobJson } from "@/lib/server/job-run";

export const dynamic = "force-dynamic";

/** Daily billing job, called by the Cloudflare Cron Trigger (cf-worker.ts) with CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return NextResponse.json({ ok: false }, { status: 401 });
  const engine = billingEngine();
  const admin = createAdminClient();
  // Test-mode plans renew only where test payments are on (never in production: BILLING_MOCK is a preview-only var).
  const result = await runDaily(engine, (sub, attempt) => chargeSaved(admin, engine.store, sub, attempt), undefined, { includeMock: process.env.BILLING_MOCK === "1" });
  return jobJson("billing", { ok: true, job: "billing", at: new Date().toISOString(), ...result });
}

/** Charges the plan's saved card. Test-mode plans succeed unless the learner chose a declining test card. */
async function chargeSaved(admin: ReturnType<typeof createAdminClient>, store: ReturnType<typeof billingEngine>["store"], sub: Sub, attempt: number) {
  const { data: tok } = await admin.from("payment_tokens").select("token").eq("user_id", sub.userId).eq("provider", sub.provider).maybeSingle();
  if (!tok?.token) return null;
  const token = await unseal(tokenKey(), tok.token as string);
  if (sub.provider === "mock") {
    const ok = token !== "mock:decline";
    const ref = `r_${sub.id}_${sub.currentPeriodEnd.slice(0, 10)}_${attempt}`;
    return transactionEvent({ id: `mock-${ref}`, success: ok, pending: false, amount_cents: sub.renewAmountMinor, currency: sub.currency, created_at: new Date().toISOString(), order: { merchant_order_id: ref }, source_data: { pan: sub.cardLast4 ?? "4242", sub_type: sub.cardBrand ?? "Visa", type: "card" } }, "mock");
  }
  const who = await store.learner(sub.userId);
  return chargeToken(sub, token, { email: who?.email ?? "learner@uxgate.org", name: who?.name ?? null, country: sub.country }, attempt);
}
