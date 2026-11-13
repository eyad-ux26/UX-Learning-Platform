import { notFound } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import { localPathName } from "@/lib/catalog";
import { certStats } from "@/lib/certificate-stats";
import { requireLearner } from "@/lib/server/learner";
import { ensureCertificates } from "@/lib/server/certificates";
import { renderCertPng } from "@/lib/server/cert-og";
import { certFileName } from "@/lib/certificate-share";

// "Download PDF" on the certificate page: a one-page landscape PDF with the certificate image (drawn at 2x), sent as an attachment so
// the download starts at once. Only the owner can ask. The file is named after the learner and the path.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ locale: string; pathId: string }> }) {
  const { locale, pathId } = await params;
  if (locale !== "en" && locale !== "ar") notFound();
  const me = await requireLearner(locale);
  const cert = (
    await ensureCertificates(
      me.userId,
      me.joined.map((j) => j.pathId),
      me.skillStates,
    )
  ).find((c) => c.pathId === pathId);
  if (!cert) notFound();
  const name = me.progress.displayName ?? "";
  const pathName = localPathName(pathId, locale);
  const s = certStats(pathId);
  const issued = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(cert.issuedAt));
  const png = await (
    await renderCertPng(
      {
        name,
        pathName,
        shown: s.skills,
        checks: s.checks,
        lessons: s.lessons,
        issued,
        code: cert.code,
        pathId,
        locale,
      },
      new URL(req.url).origin,
      2,
    )
  ).arrayBuffer();
  const pdf = await PDFDocument.create();
  pdf.setTitle(`UXGate certificate: ${name}, ${pathName}`);
  pdf.setAuthor("UXGate");
  const img = await pdf.embedPng(png);
  const w = 842,
    h = Math.round((842 * 628) / 1200); // A4 landscape width, the art's proportions
  const page = pdf.addPage([w, h]);
  page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  const bytes = await pdf.save();
  const file = certFileName(name, pathName, "pdf");
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file.ascii}"; filename*=UTF-8''${encodeURIComponent(file.utf8)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
