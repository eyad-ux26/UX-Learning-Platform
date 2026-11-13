import "server-only";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Answers a scheduled job's request and notes the run in job_runs (0063), so System health shows when each job last
 * ran and whether it worked. A failed note never fails the job (before 0063 the table is missing).
 */
export async function jobJson(
  name: string,
  body: Record<string, unknown>,
  init?: { status?: number },
): Promise<NextResponse> {
  const ok = !init?.status || init.status < 400;
  try {
    await createAdminClient()
      .from("job_runs")
      .insert({ name, ok, detail: JSON.stringify(body).slice(0, 500) });
  } catch {
    /* noted best effort */
  }
  return NextResponse.json(body, init);
}
