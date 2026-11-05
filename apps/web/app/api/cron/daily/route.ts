import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleLearner } from "@/lib/server/settle";
import { shiftDay, weekStartFor } from "@/lib/freeze";

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
  // Anyone whose settled day is before yesterday in the earliest time zone (UTC-12) may have days to settle.
  const cutoff = shiftDay(new Date().toISOString().slice(0, 10), -1);
  const { data: rows, error } = await db.from("streaks").select("user_id, settled_through").or(`settled_through.is.null,settled_through.lt.${cutoff}`).order("settled_through", { ascending: true, nullsFirst: true }).limit(BATCH);
  if (error) return NextResponse.json({ error: "read_failed" }, { status: 500 });
  const ids = (rows ?? []).map((r) => r.user_id as string);
  const { data: zones } = ids.length ? await db.from("profiles").select("user_id, time_zone, locale").in("user_id", ids) : { data: [] };
  const prof = new Map((zones ?? []).map((z) => [z.user_id as string, { tz: (z.time_zone as string | null) ?? null, start: weekStartFor(z.locale as string | null) }]));
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
  return NextResponse.json({ settled, failed, stoppedEarly, more: stoppedEarly ? true : ids.length === BATCH });
}
