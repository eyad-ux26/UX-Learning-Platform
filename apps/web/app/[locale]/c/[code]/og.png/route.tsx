import { notFound } from "next/navigation";
import { localPathName } from "@/lib/catalog";
import { certStats } from "@/lib/certificate-stats";
import { publicCertificate } from "@/lib/server/certificates";
import { renderCertPng } from "@/lib/server/cert-og";

// The picture LinkedIn shows for a public certificate. Read on every request, like the page: off means gone.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  const c = await publicCertificate(code);
  if (!c || (locale !== "en" && locale !== "ar")) notFound();
  const s = certStats(c.pathId);
  const issued = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(c.issuedAt));
  return renderCertPng({ name: c.name, pathName: localPathName(c.pathId, locale), shown: s.skills, checks: s.checks, lessons: s.lessons, issued, code: c.code, pathId: c.pathId, locale }, new URL(req.url).origin);
}
