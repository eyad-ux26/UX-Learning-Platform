import { NextResponse } from "next/server";
import { z } from "zod";
import { COUNTRIES } from "@/lib/billing/pricing";
import { billingCaller, bad } from "@/lib/server/billing/route";

const body = z.object({ country: z.string().regex(/^[A-Z]{2}$/) });

/** Sets the country the learner pays from. It picks the prices and the provider; a live plan keeps its own country. */
export async function POST(req: Request) {
  const who = await billingCaller(req, "country");
  if ("error" in who) return who.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const country = parsed.data.country;
  if (!COUNTRIES.includes(country) && !/^[A-Z]{2}$/.test(country)) return bad();
  const { error } = await who.admin.from("billing_accounts").upsert({ user_id: who.user.id, country, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return bad("save_failed", 500);
  return NextResponse.json({ ok: true, country });
}
