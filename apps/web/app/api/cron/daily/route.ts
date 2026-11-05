import { NextResponse } from "next/server";

// Daily maintenance job. Called by the Cloudflare Cron Trigger (cf-worker.ts), with CRON_SECRET.
// Slice 3 fills in the real work (streak freezes, reminders); for now it only proves the schedule reaches the app.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, job: "daily", at: new Date().toISOString() });
}
