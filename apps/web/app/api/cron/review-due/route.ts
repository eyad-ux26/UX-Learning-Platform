import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyReviewsDue } from "@/lib/server/progress-notify";
import { jobJson } from "@/lib/server/job-run";

export const dynamic = "force-dynamic";
// Each notice costs a few database calls (choices, inbox row, push), so a call handles 25 learners and names the next one.
const BATCH = 25;

/**
 * Tells learners once a day that skills came due for review (inbox and push, as each learner chose). Called by the daily
 * Cron Trigger with `Authorization: Bearer $CRON_SECRET`, again with `?after=<next>` while `next` is set.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const after = new URL(req.url).searchParams.get("after");
  try {
    const r = await notifyReviewsDue(createAdminClient(), new Date(), after && /^[0-9a-f-]{36}$/.test(after) ? after : null, BATCH);
    if (r.stoppedEarly) console.warn(`WARN review notices stopped early: subrequest budget used up after ${r.notified} learners. Turn on Workers Paid before real learners arrive.`);
    return jobJson("review-due", r as Record<string, unknown>);
  } catch (e) {
    return jobJson("review-due", { error: "read_failed", detail: (e as Error).message }, { status: 500 });
  }
}
