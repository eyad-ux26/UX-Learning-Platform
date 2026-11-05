import { NextResponse } from "next/server";
import { verifyPaymob } from "@/lib/billing/paymob";
import { applyEvent } from "@/lib/billing/engine";
import { billingEngine } from "@/lib/server/billing";
import { paymobConfig } from "@/lib/server/billing/config";

export const dynamic = "force-dynamic";

/**
 * Paymob transaction and saved-card callbacks. The HMAC is checked before anything is read; a repeated callback is a
 * no-op. Answers 200 once applied, so Paymob stops retrying; a failure answers 500 and Paymob tries again.
 */
export async function POST(req: Request) {
  const c = paymobConfig();
  if (!c.hmac) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await req.text();
  const v = await verifyPaymob(body, new URL(req.url).searchParams.get("hmac"), c.hmac);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: v.reason === "signature" ? 401 : 400 });
  try {
    const engine = billingEngine();
    const results = [];
    for (const ev of v.events) results.push(await applyEvent(engine, ev, JSON.parse(body)));
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("paymob webhook", v.eventId, err);
    return NextResponse.json({ error: "apply_failed" }, { status: 500 });
  }
}

/** Paymob sends the learner back with a GET carrying the same signed fields; the return page reads our own session instead. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
