import { NextResponse } from "next/server";
import { billingCaller } from "@/lib/server/billing/route";

/**
 * Starts the learner's one free trial (0062). The database decides: the flag `trials` must be on, and the learner must
 * never have had Pro, a subscription or a trial. No card, no provider: Pro simply ends when the trial does.
 */
export async function POST(req: Request) {
  const who = await billingCaller(req, "trial", 5);
  if ("error" in who) return who.error;
  const { data, error } = await who.admin.rpc("start_trial", { p_user: who.user.id });
  if (error) {
    const why = /not available: (\w+)/.exec(error.message)?.[1];
    if (why) return NextResponse.json({ ok: false, error: `trial_${why}` }, { status: 409 });
    console.error("trial: start failed", error.code, error.message);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, endsAt: data });
}
