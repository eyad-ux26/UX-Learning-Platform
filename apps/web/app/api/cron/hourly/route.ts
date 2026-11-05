import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeDeleted, runReminders } from "@/lib/server/reminders";

export const dynamic = "force-dynamic";

/**
 * The hourly job (Cloudflare Cron Trigger "0 * * * *", see cf-worker.ts): daily reminders at each learner's own hour,
 * at most one a day, and removal of accounts whose 30-day undo window has passed. Bearer CRON_SECRET only.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = createAdminClient();
  try {
    const purged = await purgeDeleted(db);
    const r = await runReminders(db);
    return NextResponse.json({ job: "hourly", purged, ...r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
