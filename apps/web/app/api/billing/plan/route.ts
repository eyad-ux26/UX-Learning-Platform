import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelPlan, changePlan, resumePlan } from "@/lib/billing/engine";
import { billingCaller, bad } from "@/lib/server/billing/route";
import { billingEngine, providerActions } from "@/lib/server/billing";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), reason: z.string().max(200).nullish() }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("change"), period: z.enum(["month", "year"]) }),
]);

/** The learner's own plan changes: cancel (Pro to the period end), resume, and switch between monthly and annual. */
export async function POST(req: Request) {
  const who = await billingCaller(req, "plan", 10);
  if ("error" in who) return who.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const engine = billingEngine();
  try {
    const a = parsed.data;
    const sub = a.action === "cancel" ? await cancelPlan(engine, who.user.id, a.reason?.trim() || null, providerActions)
      : a.action === "resume" ? await resumePlan(engine, who.user.id, providerActions)
      : await changePlan(engine, who.user.id, a.period, providerActions);
    if (!sub) return bad("no_plan", 409);
    return NextResponse.json({ ok: true, status: sub.status, periodEnd: sub.currentPeriodEnd, pendingPeriod: sub.pendingPeriod });
  } catch (err) {
    console.error("billing plan change", err);
    return bad("provider", 502);
  }
}
