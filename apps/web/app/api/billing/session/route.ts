import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** The status of the learner's own checkout (the return page asks until it is paid, pending, failed or cancelled). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const db = await createClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // RLS: only the learner's own session is visible.
  const { data } = await db.from("checkout_sessions").select("status, provider, kind, period").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
