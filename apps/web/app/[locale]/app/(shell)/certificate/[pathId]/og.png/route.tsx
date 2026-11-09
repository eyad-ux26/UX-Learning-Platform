import { notFound } from "next/navigation";
import { localPathName } from "@/lib/catalog";
import { certStats } from "@/lib/certificate-stats";
import { requireLearner } from "@/lib/server/learner";
import { ensureCertificates } from "@/lib/server/certificates";
import { renderCertPng } from "@/lib/server/cert-og";

// The owner's PNG download ("Image" on the certificate page). Works while the certificate page is private: only the owner can ask.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ locale: string; pathId: string }> }) {
  const { locale, pathId } = await params;
  if (locale !== "en" && locale !== "ar") notFound();
  const me = await requireLearner(locale);
  const cert = (await ensureCertificates(me.userId, me.joined.map((j) => j.pathId), me.skillStates)).find((c) => c.pathId === pathId);
  if (!cert) notFound();
  const s = certStats(pathId);
  const issued = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(cert.issuedAt));
  const res = await renderCertPng({ name: me.progress.displayName ?? "", pathName: localPathName(pathId, locale), shown: s.skills, checks: s.checks, lessons: s.lessons, issued, code: cert.code, pathId, locale }, new URL(req.url).origin);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Content-Disposition", `attachment; filename="uxgate-certificate-${pathId}.png"`);
  return res;
}
