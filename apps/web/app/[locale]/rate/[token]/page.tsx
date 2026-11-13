/* eslint-disable @next/next/no-img-element */
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256Hex } from "@/lib/admin/tokens";
import { Logo } from "@/components/Logo";
import { RateForm } from "./RateForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false }, referrer: "no-referrer" };

const T = {
  en: {
    title: "How was our help?",
    body: (id: number) => `Request #${id}. Pick one answer, then send it.`,
    done: "Thank you, we already have your answer.",
    gone: "This link is no longer valid.",
  },
  ar: {
    title: "كيف كانت مساعدتنا؟",
    body: (id: number) => `الطلب رقم ${id}. اختر إجابة واحدة، ثم أرسلها.`,
    done: "شكرًا لك، وصلتنا إجابتك من قبل.",
    gone: "هذا الرابط لم يعد صالحًا.",
  },
};

/**
 * The survey email links here with ?v=good or ?v=bad. Opening the page records nothing: mail scanners open links on
 * their own, so the learner's answer counts only when they press Send.
 */
export default async function RatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { locale: l, token } = await params;
  setRequestLocale(l);
  const locale: "en" | "ar" = l === "ar" ? "ar" : "en";
  const t = T[locale];
  const v = (await searchParams).v;
  const valid = /^[A-Za-z0-9_-]{32,64}$/.test(token);
  const { data } = valid
    ? await createAdminClient()
        .from("support_tickets")
        .select("id, satisfaction_at")
        .eq("satisfaction_token_hash", await sha256Hex(token))
        .maybeSingle()
    : { data: null };
  return (
    <div className="s4-pub">
      <header className="pub-head">
        <Logo height={30} />
      </header>
      <main className="bye">
        <img src="/ill/uxgate-ill-gate.png" alt="" width={104} height={104} />
        <h1>{t.title}</h1>
        {!data ? (
          <p>{t.gone}</p>
        ) : data.satisfaction_at ? (
          <p>{t.done}</p>
        ) : (
          <>
            <p>{t.body(data.id as number)}</p>
            <RateForm token={token} locale={locale} initial={v === "good" || v === "bad" ? v : null} />
          </>
        )}
      </main>
    </div>
  );
}
