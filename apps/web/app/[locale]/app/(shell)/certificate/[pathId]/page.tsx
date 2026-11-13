import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { CertificateMain } from "@/components/app/CertificateView";
import { requireLearner } from "@/lib/server/learner";
import { ensureCertificates } from "@/lib/server/certificates";

export const dynamic = "force-dynamic";

export default async function CertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; pathId: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const { locale, pathId } = await params;
  const { share } = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  // Issued only when every skill of the path is Shown; anything else is a 404, never an empty certificate.
  const cert = (
    await ensureCertificates(
      me.userId,
      me.joined.map((j) => j.pathId),
      me.skillStates,
    )
  ).find((c) => c.pathId === pathId);
  if (!cert) notFound();
  const { data: prof } = me.db
    ? await me.db.from("profiles").select("name_confirmed_at").eq("user_id", me.userId).maybeSingle()
    : { data: null };
  return (
    <Shell me={me}>
      <CertificateMain me={me} cert={cert} nameConfirmed={!!prof?.name_confirmed_at} openShare={share === "1"} />
    </Shell>
  );
}
