import { setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { ReturnView } from "@/components/billing/ReturnView";
import { requireLearner } from "@/lib/server/learner";
import { pickPath } from "@/lib/learning";

export const dynamic = "force-dynamic";

const STATES = ["returning", "success", "pending", "pendingBank", "failed", "cancelled"] as const;

export default async function CheckoutReturnPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const session = sp.session && /^[0-9a-f-]{36}$/i.test(sp.session) ? sp.session : null;
  let provider: "paymob" | "paddle" = "paymob";
  let mock = false;
  if (me.db && session) {
    const { data } = await me.db.from("checkout_sessions").select("provider, region").eq("id", session).maybeSingle();
    if (data?.provider === "paddle" || (data?.provider === "mock" && data.region !== "eg")) provider = "paddle";
    mock = data?.provider === "mock";
  }
  // Screens without a database show one state at a time (?state=success).
  const fixtureState = !me.db ? (STATES.find((s) => s === sp.state) ?? "success") : undefined;
  const path = pickPath(me.currentPathId ?? me.recommendedPathId);
  return (
    <div className="chk-page">
      <header className="pub-head"><Logo height={30} /></header>
      <ReturnView sessionId={session} fixtureState={fixtureState} pathHref={path ? `/app/path/${path.id}` : "/app"} overlayClosed={sp.left === "1"} providerName={provider} mock={mock} />
    </div>
  );
}
