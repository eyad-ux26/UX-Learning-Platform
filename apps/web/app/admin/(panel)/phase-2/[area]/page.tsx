import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { NAV } from "@/lib/admin/permissions";
import { Card, Empty, PageHead } from "@/components/admin/ui";

export const metadata = { title: "Coming in Phase 2" };

// Menu items of Phase 2 areas open this placeholder until they are built (Admins' answer 3, 9 Nov 2026).
const WHAT: Record<string, string> = {
  help: "English and Arabic help pages, linked from macros and the learner app.",
  paths: "Edit paths in English and Arabic side by side, with draft, review and publish.",
  lessons: "Edit units, lessons and steps with a live preview in the real player.",
  skills: "Skills and misconceptions with stable ids, where each is used and wrong-answer rates.",
  media: "Bunny videos with processing status, captions and transcripts in English and Arabic.",
  instructors: "Instructor profiles that feed the hybrid path cards.",
  quality: "Content quality flags per lesson and step, with a review queue.",
  releases: "Scheduled releases, version compare and roll back.",
  reports: "Learning, growth, money and certificate reports, saved and scheduled.",
  communications: "Email templates, campaigns, in-app announcements, the waitlist and the email log.",
  settings: "Feature flags, learning rules, the Coming Soon gate and legal pages.",
  health: "Status of the app, database, email, video, webhooks and scheduled jobs.",
};

export default async function Phase2({ params }: { params: Promise<{ area: string }> }) {
  await requireAdmin();
  const { area } = await params;
  if (!WHAT[area]) notFound();
  const item = NAV.flatMap((g) => g.items).find((i) => i.href === `/admin/phase-2/${area}`);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: item?.label ?? area }]} title={item?.label ?? area} />
      <Card><Empty icon="rocket-launch" title="Coming in Phase 2">{WHAT[area]} Until then, content changes keep going through pull requests.</Empty></Card>
    </main>
  );
}
