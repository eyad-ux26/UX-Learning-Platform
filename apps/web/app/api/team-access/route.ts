import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { withinMemoryLimit } from "@/lib/server/rate-limit";
import { clientIp, ipHash } from "@/lib/server/ip-hash";
import { comingSoonOn } from "@/lib/coming-soon";
import { signTeamPass, TEAM_COOKIE, TEAM_PASS_SECONDS, teamPasswordMatches } from "@/lib/team-access";

// The team password page (/team) posts here. Every try counts, right or wrong: 5 per network per 15 minutes and 100 an
// hour from everyone, in the database (hit_team_gate, 0038), plus a per-instance counter. If the counter cannot be read,
// nobody gets in (fail closed). A right password sets the ug_team pass for 12 hours. The answer never says more than
// right, wrong or wait.

const json = (body: object, status = 200, headers?: Record<string, string>) => NextResponse.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
const wait = () => json({ error: "rate_limited" }, 429, { "retry-after": "900" });

export async function POST(req: NextRequest) {
  if (!comingSoonOn()) return json({ error: "off" }, 404);
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return json({ error: "bad_origin" }, 403);
  const ip = clientIp(req.headers);
  if (!withinMemoryLimit(`team:${ip}`, 5, 15 * 60_000)) return wait();
  if (!hasServiceKey()) return json({ error: "unavailable" }, 503);

  const { data: allowed, error } = await createAdminClient().rpc("hit_team_gate", { p_ip_hash: await ipHash(ip, "team") });
  if (error) {
    console.error("team access: counter", error.code);
    return json({ error: "unavailable" }, 503);
  }
  if (allowed !== true) return wait();

  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const typed = typeof body?.password === "string" ? body.password : "";
  if (!(await teamPasswordMatches(typed))) {
    console.warn("team access: wrong password");
    return json({ error: "wrong" }, 401);
  }
  const pass = await signTeamPass();
  if (!pass) return json({ error: "unavailable" }, 503);
  const res = json({ ok: true });
  res.cookies.set(TEAM_COOKIE, pass, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: TEAM_PASS_SECONDS });
  return res;
}
