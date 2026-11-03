import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleLearner } from "@/lib/server/settle";
import { shiftDay } from "@/lib/freeze";

export const dynamic = "force-dynamic";
const BATCH = 500;

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
  const { data: zones } = ids.length ? await db.from("profiles").select("user_id, time_zone").in("user_id", ids) : { data: [] };
  const tz = new Map((zones ?? []).map((z) => [z.user_id as string, (z.time_zone as string | null) ?? null]));
  for (const id of ids) await settleLearner(id, tz.get(id) ?? null);
  return NextResponse.json({ settled: ids.length, more: ids.length === BATCH });
}
