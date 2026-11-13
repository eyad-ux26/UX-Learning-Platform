import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext, signInLocale } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { restoreIfDeleting } from "@/lib/server/account";
import { routing } from "@/i18n/routing";

/**
 * Where Apple, Google, email links and reset links land. Swaps the one-time code for a session, remembers the learner's
 * language, undoes a pending account deletion, then sends them into the app (or to onboarding, which the app itself decides).
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const locale = (routing.locales as readonly string[]).includes(searchParams.get("locale") ?? "")
    ? searchParams.get("locale")!
    : routing.defaultLocale;
  const next = safeNext(searchParams.get("next"));
  const reset = next === "/reset";
  const code = searchParams.get("code");
  // A sign-in link the support team sent (admin panel): a one-time token hash instead of a PKCE code, so it works in
  // any browser the learner opens it in.
  const tokenHash = searchParams.get("token_hash");
  // An expired reset link goes back to "Forgot password?", where a new one is one tap away.
  const fail = NextResponse.redirect(`${origin}/${locale}/${reset ? "forgot" : "signin"}?error=link`);
  if (!code && !(tokenHash && /^[0-9a-f]{20,200}$/i.test(tokenHash))) return fail;

  const db = await createClient();
  const { data, error } = code
    ? await db.auth.exchangeCodeForSession(code)
    : await db.auth.verifyOtp({ token_hash: tokenHash!, type: "magiclink" });
  if (error || !data.user) return fail;

  // Emails follow the language the learner last signed in with. Google sign-ups and existing learners cannot carry a language
  // into the email request itself, so it is kept up to date here.
  const fix = signInLocale(data.user, locale as "en" | "ar");
  if (fix.save) {
    await db.auth.updateUser({ data: { locale } });
    const { error: pe } = await db.from("profiles").update({ locale }).eq("user_id", data.user.id);
    if (pe) console.error("auth callback: profile locale", pe.code);
  }
  // A new Google or Apple account on the Arabic page: its week start follows Arabic too (learners cannot write it).
  if (fix.weekStart !== null && hasServiceKey()) {
    const { error: we } = await createAdminClient()
      .from("profiles")
      .update({ week_start: fix.weekStart })
      .eq("user_id", data.user.id);
    if (we) console.error("auth callback: profile week start", we.code);
  }

  // Signing in during the 30 days after a delete request keeps the account; the app says so (?restored=1).
  const restored = await restoreIfDeleting(data.user.id).catch(() => false);
  if (restored) return NextResponse.redirect(`${origin}/${locale}${reset ? "/reset" : "/app/settings"}?restored=1`);
  // The admin panel lives outside the locale routes.
  if (next === "/admin" || next.startsWith("/admin/")) return NextResponse.redirect(`${origin}${next}`);
  return NextResponse.redirect(`${origin}/${locale}${next}`);
}
