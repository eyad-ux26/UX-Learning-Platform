import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { getAdminState, audit } from "@/lib/admin/guard";

// Signs out of the panel: ends this panel session (it never opens again), logs it, and signs the account out.
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return new NextResponse("Forbidden", { status: 403 });
  const s = await getAdminState();
  if (s.kind === "ok" && hasServiceKey()) {
    await createAdminClient().from("admin_sessions").update({ ended_at: new Date().toISOString(), end_reason: "signout" }).eq("session_id", s.ctx.sessionId).is("ended_at", null);
    await audit(s.ctx, "auth.sign_out", "auth", { type: "session", id: s.ctx.sessionId });
  }
  if (hasServiceKey()) await (await createClient()).auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/admin/signin?out=1", req.url), 303);
}
