import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/public/ComingSoon";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { looksLikeToken, tokenHash } from "@/lib/waitlist";

// The link in the launch list's confirmation email (?t=). A valid link (7 days) puts the address on the list and shows
// "You're on the list"; anything else shows the form again with "That link has expired". Never indexed.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ t?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "soon" });
  return { title: { absolute: t("metaTitle") }, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

async function confirm(token: string | undefined): Promise<string | null> {
  if (!looksLikeToken(token) || !hasServiceKey()) return null;
  const { data, error } = await createAdminClient().rpc("confirm_waitlist", { p_token_hash: await tokenHash(token) });
  if (error) console.error("waitlist: confirm", error.code);
  const row = Array.isArray(data) ? (data[0] as { email?: string } | undefined) : undefined;
  return row?.email ?? null;
}

export default async function ConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const email = await confirm((await searchParams).t);
  return <ComingSoon locale={locale} view={email ? { kind: "confirmed", email } : { kind: "expired" }} />;
}
