import { sameSecret } from "@/lib/server/secret";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleLearner } from "@/lib/server/settle";
import { resolveWeekStart } from "@/lib/freeze";
import { sendQueuedConfirmations } from "@/lib/server/waitlist-mail";
import { sendTrialEmails } from "@/lib/server/trial-mail";
import { sendWeeklyReports } from "@/lib/server/report-mail";
import { jobJson } from "@/lib/server/job-run";

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
  if (!secret || !sameSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = createAdminClient();
  // Launch list (0038): unconfirmed addresses go after 30 days. Cheap and safe to repeat; an error (before 0038) is ignored.
  const { data: pruned } = await db.rpc("prune_waitlist");
  // System health keeps 30 days of job runs (0063). An error before 0063 is ignored.
  await db.rpc("job_runs_prune");
  // Addresses that joined while email could not go out get their confirmation link once it can (no-op until then).
  const confirmations = await sendQueuedConfirmations(db).catch(() => ({ sent: 0, failed: 0 }));
  // Free trials (0062): the "ends in 2 days" and "ended" emails. No-op before 0062 or without email.
  const trials = await sendTrialEmails(db).catch(() => ({ sent: 0, failed: 0 }));
  // Admin panel: weekly saved reports to the team (Mondays), and campaign emails in batches (0063). No-ops before 0063.
  const reports = await sendWeeklyReports(db).catch(() => ({ sent: 0, failed: 0 }));
  // Only learners whose settled day is before their own yesterday (in their time zone), oldest first: a learner west of
  // UTC who is already settled up to their local yesterday is not picked again, so every call makes progress (#139).
  const { data: rows, error } = await db.rpc("settle_candidates", { p_limit: BATCH });
  if (error) return jobJson("daily", { error: "read_failed" }, { status: 500 });
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
  return jobJson("daily", { settled, failed, stoppedEarly, pruned: typeof pruned === "number" ? pruned : null, confirmations, trials, reports, more: stoppedEarly ? true : ids.length === BATCH && settled > 0 }); // a batch that only failed would come back the same: stop there
}
