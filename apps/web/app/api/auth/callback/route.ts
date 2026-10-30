import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { routing } from "@/i18n/routing";

/**
 * Where Google and email links land. Swaps the one-time code for a session, remembers the learner's language,
 * then sends them into the app (or to onboarding, which the app itself decides).
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const locale = (routing.locales as readonly string[]).includes(searchParams.get("locale") ?? "") ? searchParams.get("locale")! : routing.defaultLocale;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const fail = NextResponse.redirect(`${origin}/${locale}/signin?error=link`);
  if (!code) return fail;

  const db = await createClient();
  const { data, error } = await db.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail;

  // Google sign-ups cannot carry a language through the redirect, so set it here once.
  if (!data.user.user_metadata?.locale) {
    await db.auth.updateUser({ data: { locale } });
    await db.from("profiles").update({ locale }).eq("user_id", data.user.id);
  }
  return NextResponse.redirect(`${origin}/${locale}${next}`);
}
