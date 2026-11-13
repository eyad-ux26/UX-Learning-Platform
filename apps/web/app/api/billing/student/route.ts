import { NextResponse } from "next/server";
import { z } from "zod";
import { isStudentEmail, STUDENT_LINK_HOURS, STUDENT_VALID_DAYS } from "@/lib/billing/student";
import { randomToken, sha256Hex } from "@/lib/billing/crypto";
import { renderEmail } from "@/lib/billing/emails";
import { billingCaller, bad } from "@/lib/server/billing/route";
import { resendTransport } from "@/lib/server/billing";
import { hostOf, mockAllowed } from "@/lib/server/billing/config";

const send = z.object({
  action: z.literal("send"),
  email: z.string().trim().max(200),
  locale: z.enum(["en", "ar"]).default("en"),
});
const confirm = z.object({ action: z.literal("confirm"), token: z.string().regex(/^[0-9a-f]{64}$/) });

/** Student price: a link to a university email (24 hours), then 40% off while the check is valid (a year). */
export async function POST(req: Request) {
  const who = await billingCaller(req, "student", 5);
  if ("error" in who) return who.error;
  const json = await req.json().catch(() => null);
  const url = new URL(req.url);

  const c = confirm.safeParse(json);
  if (c.success) {
    const hash = await sha256Hex(c.data.token);
    const { data } = await who.admin
      .from("student_checks")
      .select("token_hash, expires_at")
      .eq("user_id", who.user.id)
      .maybeSingle();
    if (!data?.token_hash || data.token_hash !== hash || new Date(data.expires_at) <= new Date())
      return bad("link_expired", 410);
    const now = new Date();
    await who.admin
      .from("student_checks")
      .update({
        token_hash: null,
        verified_at: now.toISOString(),
        valid_until: new Date(now.getTime() + STUDENT_VALID_DAYS * 86_400_000).toISOString(),
      })
      .eq("user_id", who.user.id);
    return NextResponse.json({ ok: true });
  }

  const s = send.safeParse(json);
  if (!s.success) return bad();
  if (!isStudentEmail(s.data.email)) return bad("not_student_email", 422);
  const token = randomToken();
  const now = new Date();
  await who.admin.from("student_checks").upsert(
    {
      user_id: who.user.id,
      email: s.data.email.toLowerCase(),
      token_hash: await sha256Hex(token),
      sent_at: now.toISOString(),
      expires_at: new Date(now.getTime() + STUDENT_LINK_HOURS * 3_600_000).toISOString(),
    },
    { onConflict: "user_id" },
  );
  const link = `${url.origin}/${s.data.locale}/app/plans/student?token=${token}`;
  const transport = resendTransport();
  if (transport) {
    const m = renderEmail("studentLink", { locale: s.data.locale, site: url.origin, name: null, extra: { link } });
    await transport({ to: s.data.email, subject: m.subject, html: m.html, text: m.text });
  }
  // With no email provider on a test host, hand the link back so the flow can still be tried.
  const testLink = !transport && mockAllowed(hostOf(req)) ? link : undefined;
  return NextResponse.json({ ok: true, ...(testLink ? { testLink } : {}) });
}
