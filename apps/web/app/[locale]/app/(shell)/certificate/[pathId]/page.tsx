import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { CertificateMain } from "@/components/app/CertificateView";
import { requireLearner } from "@/lib/server/learner";
import { ensureCertificates } from "@/lib/server/certificates";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ locale: string; pathId: string }> }) {
  const { locale, pathId } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  // Issued only when every skill of the path is Shown; anything else is a 404, never an empty certificate.
  const cert = (await ensureCertificates(me.userId, me.joined.map((j) => j.pathId), me.skillStates)).find((c) => c.pathId === pathId);
  if (!cert) notFound();
  return <Shell me={me}><CertificateMain me={me} cert={cert} /></Shell>;
}
