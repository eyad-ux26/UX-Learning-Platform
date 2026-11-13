import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResetForm } from "@/components/app/AuthForm";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth4" });
  return { title: t("rTitle"), robots: { index: false } };
}

/** Set a new password. The reset link signs the learner in through /api/auth/callback?next=/reset first. */
export default async function ResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restored?: string }>;
}) {
  const { locale } = await params;
  const { restored } = await searchParams;
  setRequestLocale(locale);
  const signedIn = hasSupabase() ? !!(await (await createClient()).auth.getUser()).data.user : false;
  return <ResetForm signedIn={signedIn} restored={restored === "1"} />;
}
