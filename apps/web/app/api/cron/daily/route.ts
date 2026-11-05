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
  for (const id of ids) await settleLearner(id, prof.get(id)?.tz ?? null, new Date(), prof.get(id)?.start);
  return NextResponse.json({ settled: ids.length, more: ids.length === BATCH });
}
