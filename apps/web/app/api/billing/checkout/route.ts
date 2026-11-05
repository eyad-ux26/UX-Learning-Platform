import { NextResponse } from "next/server";
import { z } from "zod";
import { billingCaller, bad } from "@/lib/server/billing/route";
import { startCheckout } from "@/lib/server/billing/checkout";

const body = z.object({
  period: z.enum(["month", "year"]).default("month"),
  code: z.string().max(40).nullish(),
  kind: z.enum(["new", "renewal", "card"]).default("new"),
  locale: z.enum(["en", "ar"]).default("en"),
});

/** Starts a checkout. The server prices it; the answer is the provider's secure page (or Paddle's transaction to open). */
export async function POST(req: Request) {
  const who = await billingCaller(req, "checkout", 10);
  if ("error" in who) return who.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const { data: acct } = await who.admin.from("billing_accounts").select("country").eq("user_id", who.user.id).maybeSingle();
  const { data: prof } = await who.admin.from("profiles").select("display_name").eq("user_id", who.user.id).maybeSingle();
  const url = new URL(req.url);
  const r = await startCheckout(who.admin, {
    userId: who.user.id, email: who.user.email ?? "", name: prof?.display_name ?? null, locale: parsed.data.locale, period: parsed.data.period,
    code: parsed.data.code || null, kind: parsed.data.kind, host: req.headers.get("x-forwarded-host") ?? url.host, origin: url.origin,
    country: acct?.country ?? req.headers.get("cf-ipcountry") ?? "EG",
  });
  return NextResponse.json(r, { status: r.ok ? 200 : r.error === "provider" ? 502 : 409 });
}
