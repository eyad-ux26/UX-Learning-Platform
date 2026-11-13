import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { withinMemoryLimit } from "@/lib/server/rate-limit";
import { sendConfirmation } from "@/lib/server/waitlist-mail";
import { clientIp, ipHash } from "@/lib/server/ip-hash";
import { newToken, parseWaitlist, WAITLIST_CONSENT, waitlistStatus } from "@/lib/waitlist";

// The Coming Soon page's launch-notify form (double opt-in, migration 0038). Anyone may post. Guards: same origin only,
// a hidden field bots fill in, a few tries a minute per network on this instance, 5 new addresses an hour per network
// in the database, and at most 5 confirmation emails per address, 2 minutes apart.
// Answers { status: "sent" } (check your inbox), { status: "already" } (confirmed) or { status: "queued" } (saved, the
// link follows once email works). The confirmation link points at the
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
    p_email: input.email,
    p_locale: input.locale,
    p_consent: WAITLIST_CONSENT[input.locale],
    p_source: "coming-soon",
    p_ip_hash: await ipHash(ip, "waitlist"),
    p_token_hash: hash,
  });
  if (error) {
    console.error("waitlist: join", error.code);
    return unavailable();
  }
  const status = waitlistStatus(String(data));
  if (status === "limited") return tooMany();
  if (!status) return unavailable();

  // No email service yet, or it failed: the address stays on the list, unconfirmed and queued, and the daily job sends the
  // link once email works. The visitor is told a link is coming rather than seeing an error.
  if (data === "send" && !(await sendConfirmation(db, input, token, hash, req.nextUrl.origin)))
    return NextResponse.json({ status: "queued" });
  return NextResponse.json({ status });
}
