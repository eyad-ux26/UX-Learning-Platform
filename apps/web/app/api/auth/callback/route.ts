import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { restoreIfDeleting } from "@/lib/server/account";
import { routing } from "@/i18n/routing";

/**
 * Where Apple, Google, email links and reset links land. Swaps the one-time code for a session, remembers the learner's
 * language, undoes a pending account deletion, then sends them into the app (or to onboarding, which the app itself decides).
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const locale = (routing.locales as readonly string[]).includes(searchParams.get("locale") ?? "") ? searchParams.get("locale")! : routing.defaultLocale;
  const next = safeNext(searchParams.get("next"));
  const reset = next === "/reset";
  const code = searchParams.get("code");
  // An expired reset link goes back to "Forgot password?", where a new one is one tap away.
  const fail = NextResponse.redirect(`${origin}/${locale}/${reset ? "forgot" : "signin"}?error=link`);
  if (!code) return fail;

  const db = await createClient();
  const { data, error } = await db.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail;

  // Emails follow the language the learner last signed in with. Google sign-ups and existing learners cannot carry a language
  // into the email request itself, so it is kept up to date here.
  if (data.user.user_metadata?.locale !== locale) {
    await db.auth.updateUser({ data: { locale } });
    await db.from("profiles").update({ locale }).eq("user_id", data.user.id);
  }

  // Signing in during the 30 days after a delete request keeps the account; the app says so (?restored=1).
  const restored = await restoreIfDeleting(data.user.id).catch(() => false);
  if (restored) return NextResponse.redirect(`${origin}/${locale}${reset ? "/reset" : "/app/settings"}?restored=1`);
  return NextResponse.redirect(`${origin}/${locale}${next}`);
}
