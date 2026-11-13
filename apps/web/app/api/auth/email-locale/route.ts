import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { withinMemoryLimit } from "@/lib/server/rate-limit";
import { clientIp } from "@/lib/server/ip-hash";

const body = z.object({ email: z.string().trim().email().max(254), locale: z.enum(["en", "ar"]) });

/**
 * Called just before a sign-in link is requested. The sign-in email follows the language saved on the account, so this saves the
 * language of the page the learner is on. It answers the same way whether or not the email has an account, so it reveals nothing.
 */
export async function POST(req: Request) {
  const ip = clientIp(req.headers); // Cloudflare's address for the visitor; X-Forwarded-For is whatever the sender wrote
  if (!withinMemoryLimit(`email-locale:${ip}`, 20, 60_000))
    return new NextResponse(null, { status: 429, headers: { "Retry-After": "60" } });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (parsed.success) {
    try {
      await createAdminClient().rpc("set_locale_by_email", {
        p_email: parsed.data.email,
        p_locale: parsed.data.locale,
      });
    } catch {
      // Without the service key or the function the email just keeps the saved language; signing in is not blocked.
    }
  }
  return new NextResponse(null, { status: 204 });
}
