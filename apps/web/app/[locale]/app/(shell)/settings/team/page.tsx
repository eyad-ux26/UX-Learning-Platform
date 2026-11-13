import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { content } from "@uxgate/content";
import { AccountFrame } from "@/components/account/AccountFrame";
import { PageTop } from "@/components/account/PageTop";
import { TeamTools } from "@/components/account/TeamTools";
import { localPathName, isPlayable } from "@/lib/catalog";
import { isAdmin } from "@/lib/coming-soon";
import { requireLearner } from "@/lib/server/learner";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Team testing tools · UXGate", robots: { index: false } };
}

/** Testing tools for admin accounts (the team): replay the tutorial, mark lessons and paths as done, reset a path. Not found for everyone else. */
export default async function TeamToolsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const allowed = me.teamView || (me.db ? isAdmin((await (await createClient()).auth.getUser()).data.user) : false);
  if (!allowed) notFound();
  const t = await getTranslations("teamTools");
  const paths = content.paths
    .filter((p) => isPlayable(p.id))
    .map((p) => ({
      id: p.id,
      name: localPathName(p.id, locale),
      units: content.units.filter((u) => u.pathId === p.id).length,
    }));
  return (
    <AccountFrame me={me} locale={locale}>
      <PageTop title={t("title")} back="/app/settings" backLabel={t("back")} />
      <TeamTools userId={me.userId} paths={paths} />
    </AccountFrame>
  );
}
