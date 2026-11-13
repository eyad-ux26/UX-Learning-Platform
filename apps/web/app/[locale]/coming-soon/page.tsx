import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon, type SoonView } from "@/components/public/ComingSoon";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { isAdmin } from "@/lib/coming-soon";
import { SITE_URL } from "@/lib/public-paths";
import { routing } from "@/i18n/routing";

// While UG_COMING_SOON=1, middleware.ts shows this page to everyone but admins at every address except the open ones
// (lib/coming-soon.ts). A signed-in member who is not an admin sees "You're on the list" with Sign out; an admin who opens
// it sees what the public sees.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "soon" });
  // It stands in for the home page, so search engines index it under the home address.
  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: t("metaTitle") },
    description: t("metaDesc"),
    alternates: { canonical: `/${locale}`, languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])) },
  };
}

type Claims = { email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> };

/** The member view for a signed-in account that is not an admin, else the public one. */
async function viewFor(): Promise<SoonView> {
  if (!hasSupabase()) return { kind: "public" };
  const { data } = await (await createClient()).auth.getClaims();
  const c = data?.claims as Claims | undefined;
  if (!c?.email || isAdmin(c)) return { kind: "public" };
  const m = c.user_metadata ?? {};
  const raw = [m.display_name, m.name, m.full_name].find((v): v is string => typeof v === "string" && v.trim() !== "");
  return { kind: "member", email: c.email, name: raw ? raw.trim().split(/\s+/)[0].slice(0, 40) : null };
}

export default async function ComingSoonPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ComingSoon locale={locale} view={await viewFor()} />;
}
