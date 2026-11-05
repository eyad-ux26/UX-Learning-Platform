import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { comingSoonOn } from "@/lib/coming-soon";
import { TEAM_COOKIE, teamPassValid } from "@/lib/team-access";
import { TeamGate } from "@/components/public/TeamGate";

// The team password page. Not linked from anywhere: only the team knows the address and the password. With a valid pass,
// or when the Coming Soon gate is off, it goes straight on to sign-in. Never indexed.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "teamGate" });
  return { title: { absolute: t("metaTitle") }, robots: { index: false, follow: false } };
}

export default async function TeamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!comingSoonOn() || (await teamPassValid((await cookies()).get(TEAM_COOKIE)?.value))) return redirect({ href: "/signin", locale }) as never;
  return <TeamGate />;
}
