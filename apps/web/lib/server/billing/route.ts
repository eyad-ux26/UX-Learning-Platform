import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withinMemoryLimit } from "@/lib/server/rate-limit";

/** The signed-in learner for a billing API call, or a ready error response. Writes go through the admin client only after this. */
export async function billingCaller(req: Request, limitKey: string, perMinute = 20) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) } as const;
  // Same-origin only: a form on another site cannot start a checkout or cancel a plan.
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return { error: NextResponse.json({ error: "bad_origin" }, { status: 403 }) } as const;
  if (!withinMemoryLimit(`${limitKey}:${data.user.id}`, perMinute, 60_000)) return { error: NextResponse.json({ error: "rate_limited" }, { status: 429 }) } as const;
  return { user: data.user, db: supabase, admin: createAdminClient() } as const;
}

export const bad = (error = "bad_request", status = 400) => NextResponse.json({ error }, { status });
