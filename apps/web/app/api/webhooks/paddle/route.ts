import { NextResponse } from "next/server";
import { verifyPaddle } from "@/lib/billing/paddle";
import { applyEvent } from "@/lib/billing/engine";
import { billingEngine } from "@/lib/server/billing";
import { paddleConfig } from "@/lib/server/billing/config";

export const dynamic = "force-dynamic";

/** Paddle notifications: signature and age checked first, then applied once per event id. */
export async function POST(req: Request) {
  const c = paddleConfig();
  if (!c.webhookSecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await req.text();
  const v = await verifyPaddle(body, req.headers.get("paddle-signature"), c.webhookSecret);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: v.reason === "signature" ? 401 : 400 });
  try {
    const engine = billingEngine();
    const results = [];
    for (const ev of v.events) results.push(await applyEvent(engine, ev, JSON.parse(body)));
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("paddle webhook", v.eventId, err);
    return NextResponse.json({ error: "apply_failed" }, { status: 500 });
  }
}
