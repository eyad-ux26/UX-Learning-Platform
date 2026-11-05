import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { withinMemoryLimit } from "@/lib/server/rate-limit";
import { sendEmail } from "@/lib/server/email/send";
import { launchConfirmEmail } from "@/lib/server/email/launch";
import { clientIp, ipHash } from "@/lib/server/ip-hash";
import { newToken, parseWaitlist, WAITLIST_CONSENT, waitlistStatus } from "@/lib/waitlist";

// The Coming Soon page's launch-notify form (double opt-in, migration 0038). Anyone may post. Guards: same origin only,
// a hidden field bots fill in, a few tries a minute per network on this instance, 5 new addresses an hour per network
// in the database, and at most 5 confirmation emails per address, 2 minutes apart.
// Answers { status: "sent" } (check your inbox) or { status: "already" } (confirmed). The confirmation link points at the
// host the visitor used, so it works on workers.dev now and on uxgate.org after the move.

const tooMany = () => NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "600" } });
const unavailable = () => NextResponse.json({ error: "unavailable" }, { status: 503 });

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const ip = clientIp(req.headers);
  if (!withinMemoryLimit(`waitlist:${ip}`, 5, 60_000)) return tooMany();

  const input = parseWaitlist(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (input.trap) return NextResponse.json({ status: "sent" }); // a bot: looks like it worked, nothing is saved
  if (!hasServiceKey()) return unavailable();

  const db = createAdminClient();
  const { token, hash } = await newToken();
  const { data, error } = await db.rpc("join_waitlist", {
    p_email: input.email, p_locale: input.locale, p_consent: WAITLIST_CONSENT[input.locale], p_source: "coming-soon",
    p_ip_hash: await ipHash(ip, "waitlist"), p_token_hash: hash,
  });
  if (error) {
    console.error("waitlist: join", error.code);
    return unavailable();
  }
  const status = waitlistStatus(String(data));
  if (status === "limited") return tooMany();
  if (!status) return unavailable();

  if (data === "send") {
    const href = `${req.nextUrl.origin}/${input.locale}/coming-soon/confirm?t=${token}`;
    const mail = launchConfirmEmail({ locale: input.locale, href });
    const sent = await sendEmail({ to: input.email, ...mail, kind: "launch-confirm", locale: input.locale });
    if (!sent.ok) {
      // Nothing went out: the next try may send again at once. The visitor sees "we couldn't add you" and can retry.
      await db.rpc("waitlist_send_failed", { p_token_hash: hash });
      return unavailable();
    }
  }
  return NextResponse.json({ status });
}
