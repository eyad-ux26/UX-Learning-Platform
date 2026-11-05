import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { PlansView } from "@/components/billing/PlansView";
import { requireLearner } from "@/lib/server/learner";
import { loadOffer } from "@/lib/server/billing/plans";
import { countryName, formatDate, shellFor } from "@/lib/server/billing/page";

export const dynamic = "force-dynamic";

export default async function PlansPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const offer = await loadOffer(me, { code: sp.code ?? null, fixtureOffer: sp.offer, fixtureCountry: sp.country });
  return (
    <Shell {...shellFor(me)}>
      <PlansView offer={offer} locale={locale as "en" | "ar"} countryName={countryName(offer.country, locale)}
        studentDate={formatDate(offer.student.validUntil, locale, true) || null} />
    </Shell>
  );
}
