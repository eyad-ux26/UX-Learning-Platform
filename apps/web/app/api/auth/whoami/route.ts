import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

/** The browser cannot read the HttpOnly session, so it asks here who is signed in (id only). */
export async function GET() {
  if (!hasSupabase()) return NextResponse.json({ id: null });
  const { data } = await (await createClient()).auth.getUser();
  return NextResponse.json({ id: data.user?.id ?? null }, { headers: { "cache-control": "no-store" } });
}
