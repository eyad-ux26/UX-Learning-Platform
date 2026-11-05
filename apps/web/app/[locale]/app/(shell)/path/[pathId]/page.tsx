import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { PathMapMain, PathMapPanel } from "@/components/app/PathMapView";
import { redirect } from "@/i18n/navigation";
import { isPlayable } from "@/lib/catalog";
import { buildPathView } from "@/lib/learning";
import { requireLearner } from "@/lib/server/learner";
import { PaywallSheet } from "@/components/billing/PaywallSheet";
import { formatMoney } from "@/lib/billing/pricing";
import { loadOffer } from "@/lib/server/billing/plans";

export const dynamic = "force-dynamic";

export default async function PathPage({ params, searchParams }: { params: Promise<{ locale: string; pathId: string }>; searchParams: Promise<{ paywall?: string }> }) {
  const { locale, pathId } = await params;
  const { paywall } = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const view = buildPathView(pathId, me.progress, me.practicedSkills);
  if (!view || !isPlayable(pathId)) notFound();
  // A path the learner has not joined has no map yet: show its page, where Start joins it.
  if (!me.joined.some((j) => j.pathId === pathId)) return redirect({ href: `/app/paths/${pathId}`, locale }) as never;
  // ?paywall=<unit id> opens the paywall over the map (a locked unit was tapped, or a Pro lesson was opened).
  const locked = !me.pro && paywall ? view.units.find((u) => u.unit.id === paywall && !u.unit.free) : undefined;
  const offer = locked ? await loadOffer(me) : null;
  const tb = await getTranslations("billing");
  return (
    <Shell me={me} panel={<PathMapPanel view={view} pro={me.pro} />}>
      <PathMapMain view={view} me={me} />
      {locked && offer ? (
        <PaywallSheet key={locked.unit.id} kind="unit" unitN={locked.number} over={`${view.path.title.en} · ${tb("unitN", { n: locked.number })}`}
          prices={{ month: formatMoney(offer.month.amount, offer.month.currency, locale as "en" | "ar"), year: formatMoney(offer.year.amount, offer.year.currency, locale as "en" | "ar") }} />
      ) : null}
    </Shell>
  );
}
