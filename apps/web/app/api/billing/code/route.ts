import { NextResponse } from "next/server";
import { z } from "zod";
import { regionFor } from "@/lib/billing/pricing";
import { billingCaller, bad } from "@/lib/server/billing/route";
import { priceFor } from "@/lib/server/billing/checkout";
import { ipCountry } from "@/lib/server/billing/config";

const body = z.object({ code: z.string().min(1).max(40), period: z.enum(["month", "year"]).default("year") });

/** Checks a discount code and answers with the price it gives (or why it does not apply). */
export async function POST(req: Request) {
  const who = await billingCaller(req, "code", 10);
  if ("error" in who) return who.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const country = ipCountry(req.headers) ?? "EG";
  const { q, codeCheck } = await priceFor(who.admin, who.user.id, country, parsed.data.period, parsed.data.code);
  if (!codeCheck?.ok) return NextResponse.json({ ok: false, error: codeCheck?.error ?? "invalid", region: regionFor(country) });
  return NextResponse.json({ ok: true, code: codeCheck.code.code, applied: q.code === codeCheck.code.code, amount: q.amount, renewAmount: q.renewAmount, currency: q.currency });
}
