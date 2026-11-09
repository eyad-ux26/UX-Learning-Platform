import Link from "next/link";
import { requireAdmin, allowed } from "@/lib/admin/guard";
import { legalStatus } from "@/lib/admin/data/settings";
import { Card, KV, NoAccess, Note, PageHead, St } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/SettingsTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Legal pages" };

/** SET-4: where the legal pages stand. Their text lives in the code (lib/legal-text.ts), so a lawyer-approved version goes in as one reviewed change. */
export default async function LegalPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "settings.view", "settings.legal")) return <NoAccess what="Legal pages" roles="a settings role" />;
  const s = legalStatus();
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Admin" }, { label: "Platform settings" }]} title="Platform settings" sub="The privacy policy, terms of use and refund policy that learners see." />
      <SettingsTabs current="legal" />
      <Note icon="lock-simple">Legal text is not edited in the panel. It changes rarely, must match in English and Arabic, and needs sign-off, so the approved text goes into the code as one reviewed change. Free trials need a change to the terms first: they say &quot;No trial&quot;.</Note>
      <Card label="Status">
        <KV rows={[
          ["Status", s.approved ? <St tone="good" icon="check-circle-fill">Approved</St> : <St tone="wait" icon="warning">Sample text, not approved</St>],
          ["Applies from", s.updated.startsWith("[") ? <span className="ink-3">Not set</span> : s.updated],
          ["Search engines", s.approved ? "May index the pages" : "Asked not to index the pages while the text is a sample"],
          ["Pages", <span key="p" className="a-row" style={{ gap: 12, flexWrap: "wrap" }}>
            {(["privacy", "terms", "refund"] as const).flatMap((k) => (["en", "ar"] as const).map((l) => <Link key={`${k}-${l}`} className="t-sm" href={`/${l}/${k}`} target="_blank">{k} ({l})</Link>))}
          </span>],
        ]} />
      </Card>
    </main>
  );
}
