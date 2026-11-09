import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

/**
 * The confirm link in an email change the support team started (admin panel, Learner 360). Opening it moves the account
 * to the new address. It works in any browser: a one-time token hash, not a PKCE code.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const locale = (routing.locales as readonly string[]).includes(searchParams.get("locale") ?? "") ? searchParams.get("locale")! : routing.defaultLocale;
  const hash = searchParams.get("token_hash") ?? "";
  if (!/^[0-9a-f]{20,200}$/i.test(hash)) return NextResponse.redirect(`${origin}/${locale}/signin?error=link`);
  const db = await createClient();
  const { error } = await db.auth.verifyOtp({ token_hash: hash, type: "email_change" });
  if (error) return NextResponse.redirect(`${origin}/${locale}/signin?error=link`);
  return NextResponse.redirect(`${origin}/${locale}/app/settings?email=changed`);
}
