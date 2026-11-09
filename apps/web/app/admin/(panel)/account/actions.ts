"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, audit, run, type ActionResult } from "@/lib/admin/guard";
import { ADMIN_THEME_COOKIE } from "@/lib/admin/rules";

/** Ends every admin session of mine and signs this account out on every device. */
export async function signOutEverywhere(_: ActionResult | null): Promise<ActionResult> {
  const r = await run(async () => {
    const ctx = await actionAdmin();
    await createAdminClient().from("admin_sessions").update({ ended_at: new Date().toISOString(), end_reason: "everywhere" }).eq("user_id", ctx.userId).is("ended_at", null);
    await audit(ctx, "auth.sign_out_everywhere", "auth", { type: "admin", id: ctx.userId, label: ctx.email });
    await (await createClient()).auth.signOut({ scope: "global" });
  });
  if (r.ok) redirect("/admin/signin?out=1");
  return r;
}

export async function setTheme(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  return run(async () => {
    await actionAdmin();
    (await cookies()).set(ADMIN_THEME_COOKIE, f.get("theme") === "dark" ? "dark" : "light", { httpOnly: true, sameSite: "lax", path: "/admin", maxAge: 60 * 60 * 24 * 365 });
  });
}
