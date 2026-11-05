import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleLearner } from "@/lib/server/settle";
import { resolveWeekStart } from "@/lib/freeze";

export const dynamic = "force-dynamic";
// Each learner costs a handful of database calls and a Worker request has a subrequest budget, so a run settles 100
// learners and says `more` when there are others; the Cron Trigger calls again while `more` is true.
const BATCH = 100;

/**
 * The daily job: settles finished days for learners who have not opened the app, so freezes are earned and used on time.
 * Every Home visit settles the visiting learner too, so this only catches the rest. Safe to run more than once.
 * The Cloudflare Cron Trigger (cf-worker.ts) calls it with `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = createAdminClient();
  // Only learners whose settled day is before their own yesterday (in their time zone), oldest first: a learner west of
  // UTC who is already settled up to their local yesterday is not picked again, so every call makes progress (#139).
  const { data: rows, error } = await db.rpc("settle_candidates", { p_limit: BATCH });
  if (error) return NextResponse.json({ error: "read_failed" }, { status: 500 });
  const list = (rows ?? []) as { user_id: string; time_zone: string | null; locale: string | null; week_start: number | null }[];
  const ids = list.map((r) => r.user_id);
  const prof = new Map(list.map((z) => [z.user_id, { tz: z.time_zone ?? null, start: resolveWeekStart(z.week_start, z.locale) }]));
  let settled = 0;
  let failed = 0;
  let stoppedEarly: string | null = null;
  for (const id of ids) {
    const r = await settleLearner(id, prof.get(id)?.tz ?? null, new Date(), prof.get(id)?.start);
    if (r.ok) { settled++; continue; }
    failed++;
    // A Worker run has a budget of outbound calls (50 on the free plan). When it runs out every later call fails the same way,
    // so stop here, say so loudly, and let the next run (or the learner's next visit) settle the rest.
    if (/subrequest/i.test(r.error)) {
      stoppedEarly = "subrequest_budget";
      console.warn(`WARN daily job stopped early: subrequest budget used up after ${settled} learners (${ids.length - settled} left). Turn on Workers Paid before real learners arrive. ${r.error}`);
      break;
    }
    console.warn(`WARN daily job: could not settle ${id}: ${r.error}`);
  }
  return NextResponse.json({ settled, failed, stoppedEarly, more: stoppedEarly ? true : ids.length === BATCH && settled > 0 }); // a batch that only failed would come back the same: stop there
}
