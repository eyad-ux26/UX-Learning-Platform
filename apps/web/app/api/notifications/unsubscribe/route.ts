import { type NextRequest } from "next/server";
import { verifyUnsub, type UnsubKind } from "@/lib/email-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { esc } from "@/lib/server/email/layout";
import en from "@/messages/en/emails.json";
import ar from "@/messages/ar/emails.json";

/**
 * The "turn off" link in reminder, review, badge and answer emails, and their List-Unsubscribe header (RFC 8058).
 * GET only shows a page with a button, because mail scanners open links on their own; nothing changes until a POST.
 * POST turns that one kind's email channel off. The mail app's one-click POST sends "List-Unsubscribe=One-Click".
 * Billing email has no token, so it can never be turned off here.
 */
export const dynamic = "force-dynamic";

type Loc = "en" | "ar";
type View = "ask" | "done" | "bad" | "error";

const locOf = (v: string | null): Loc => (v === "ar" ? "ar" : "en");

async function turnOff(userId: string, kind: UnsubKind): Promise<boolean> {
  if (!hasServiceKey()) return false;
  const db = createAdminClient();
  const { data, error } = await db.from("notification_prefs").select("prefs").eq("user_id", userId).maybeSingle();
  if (error) return false;
  // Change only this cell, so every other choice keeps following the defaults until the learner sets it.
  const stored = (data?.prefs && typeof data.prefs === "object" ? data.prefs : {}) as Record<
    string,
    Record<string, boolean> | undefined
  >;
  const prefs = { ...stored, [kind]: { ...(stored[kind] ?? {}), email: false } };
  const { error: e2 } = await db
    .from("notification_prefs")
    .upsert({ user_id: userId, prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return !e2;
}

function page(view: View, l: Loc, token: string, kind: UnsubKind | null, status = 200): Response {
  const m = (l === "ar" ? ar : en).emails.unsub;
  const other: Loc = l === "ar" ? "en" : "ar";
  const k = kind ? m.kinds[kind] : "";
  const fill = (s: string) => s.replace("{kind}", k);
  const title =
    view === "ask" ? fill(m.title) : view === "done" ? m.doneTitle : view === "bad" ? m.badTitle : m.errorTitle;
  const lead = view === "ask" ? m.lead : view === "done" ? fill(m.doneLead) : view === "bad" ? m.badLead : m.errorLead;
  const self = `/api/notifications/unsubscribe?t=${encodeURIComponent(token)}&l=`;
  const form =
    view === "ask" || view === "error"
      ? `<form method="post" action="${esc(self + l)}"><input type="hidden" name="t" value="${esc(token)}"><button type="submit">${esc(m.button)}</button></form>`
      : "";
  const html = `<!doctype html>
<html lang="${l}" dir="${l === "ar" ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>${esc(title)} · UXGate</title>
<style>
:root { --bg: #EEF6F9; --card: #FFFFFF; --line: #D3E8F0; --ink: #012E4B; --ink2: #3D5D73; --btn: #005F99; --btn-ink: #FFFFFF; --ledge: #003F66; --link: #005F99; }
@media (prefers-color-scheme: dark) { :root { --bg: #00121B; --card: #032E3B; --line: #1A4F63; --ink: #EAF7FC; --ink2: #BBD9E6; --btn: #4CC3E8; --btn-ink: #00121B; --ledge: #1E7FA6; --link: #4CC3E8; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink); font: 16px/1.6 ${l === "ar" ? "Cairo, Tahoma, 'Segoe UI', Arial, sans-serif" : "'Titillium Web', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"}; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
main { width: 100%; max-width: 480px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 28px 24px; display: flex; flex-direction: column; gap: 14px; }
.word { font-weight: 700; font-size: 22px; color: var(--ink); text-decoration: none; direction: ltr; align-self: flex-start; }
h1 { margin: 0; font-size: 24px; line-height: 1.25; }
p { margin: 0; color: var(--ink2); font-size: 15px; }
button { min-height: 48px; inline-size: 100%; border: 0; border-block-end: 4px solid var(--ledge); border-radius: 14px; background: var(--btn); color: var(--btn-ink); font: inherit; font-weight: 700; font-size: 17px; cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 3px solid var(--link); outline-offset: 3px; }
.row { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.row a { display: inline-flex; align-items: center; min-height: 44px; color: var(--link); font-weight: 700; font-size: 14px; }
</style>
</head>
<body>
<main>
<a class="word" href="/${l}" dir="ltr">UXGate</a>
<h1>${esc(title)}</h1>
<p>${esc(lead)}</p>
${form}
<div class="row"><a href="/${l}/app/settings/notifications">${esc(m.settings)}</a><a href="${esc(self + other)}" lang="${other}" hreflang="${other}">${other === "ar" ? "عربي" : "English"}</a></div>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  const l = locOf(req.nextUrl.searchParams.get("l"));
  const v = await verifyUnsub(t);
  return v ? page("ask", l, t, v.kind) : page("bad", l, "", null, 400);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const t =
    (typeof form?.get("t") === "string" ? (form.get("t") as string) : "") || req.nextUrl.searchParams.get("t") || "";
  const l = locOf(req.nextUrl.searchParams.get("l"));
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";
  const v = await verifyUnsub(t);
  if (!v) return oneClick ? new Response("invalid link", { status: 400 }) : page("bad", l, "", null, 400);
  const ok = await turnOff(v.userId, v.kind);
  if (oneClick)
    return new Response(ok ? "ok" : "try again later", {
      status: ok ? 200 : 503,
      headers: { "cache-control": "no-store" },
    });
  return ok ? page("done", l, t, v.kind) : page("error", l, t, v.kind, 503);
}
