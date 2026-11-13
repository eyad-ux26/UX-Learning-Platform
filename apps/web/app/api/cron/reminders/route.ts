import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeDeleted, runReminders } from "@/lib/server/reminders";
import { sameSecret } from "@/lib/server/secret";
import { jobJson } from "@/lib/server/job-run";

export const dynamic = "force-dynamic";

/**
 * The reminder job (Cloudflare Cron Trigger "*\/15 * * * *", see cf-worker.ts): each learner's daily reminder in the
 * quarter hour they picked, never early and at most one a day, and removal of accounts whose 30-day undo window has
 * passed. Bearer CRON_SECRET only.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = createAdminClient();
  try {
    const purged = await purgeDeleted(db);
    const r = await runReminders(db);
    return jobJson("reminders", { job: "reminders", purged, ...r });
  } catch (e) {
    return jobJson("reminders", { error: (e as Error).message }, { status: 500 });
  }
}
