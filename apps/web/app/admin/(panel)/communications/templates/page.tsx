import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { PREVIEWS } from "@/lib/admin/email-previews";
import { Card, NoAccess, Note, PageHead, St } from "@/components/admin/ui";
import { CommsTabs } from "@/components/admin/CommsTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email templates" };

const KIND = { reminder: ["info", "Learner can turn it off"], transactional: ["off", "Always arrives (about the account)"], news: ["wait", "News: only to people who get news"] } as const;

/** COM-1: every email the app sends, with sample data, in English and Arabic side by side. */
export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "comms.view", "comms.templates")) return <NoAccess what="Email templates" roles="a marketing or admin role" />;
  const t = (await searchParams).t;
  const cur = PREVIEWS.find((p) => p.id === t) ?? PREVIEWS[0];
  // Emails use absolute image addresses (uxgate.org); the preview loads the same images from this site, so the
  // page's content security policy allows them on previews and workers.dev too.
  const local = (m: ReturnType<typeof cur.render>) => ({ ...m, html: m.html.replace(/https?:\/\/[^"'\s)]+?\/ill\//g, "/ill/") });
  const en = local(cur.render("en"));
  const ar = local(cur.render("ar"));
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Grow" }, { label: "Communications" }]} title="Communications" sub="Banners in the learner app, emails to learners, and the emails the app sends by itself." />
      <CommsTabs current="templates" />
      <Note>These show sample data. The words come from the app&apos;s message files and change in a reviewed code change, so English and Arabic always change together.</Note>
      <div className="a-side">
        <Card label="Templates" pad={false}>
          <nav aria-label="Templates"><ul style={{ listStyle: "none", margin: 0, padding: 8 }}>{PREVIEWS.map((p) => (
            <li key={p.id}><Link href={`/admin/communications/templates?t=${p.id}`} aria-current={p.id === cur.id ? "page" : undefined} className="t-sm" style={{ display: "block", padding: "6px 8px", borderRadius: 8, background: p.id === cur.id ? "var(--surface-2)" : undefined }}>
              <b>{p.label}</b><span className="t-xs ink-2" style={{ display: "block" }}>{p.when}</span></Link></li>
          ))}</ul></nav>
        </Card>
        <div className="a-stack">
          <Card label={cur.label} title={cur.label} actions={<St tone={KIND[cur.kind][0]}>{KIND[cur.kind][1]}</St>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 12 }}>
              {([["English", en], ["العربية", ar]] as const).map(([label, m]) => (
                <figure key={label} style={{ margin: 0 }}>
                  <figcaption className="t-sm"><b>{label}</b> · <span className="ink-2">Subject: {m.subject}</span></figcaption>
                  <iframe title={`${cur.label} in ${label}`} srcDoc={m.html} sandbox="" style={{ width: "100%", height: 640, border: "1px solid var(--line)", borderRadius: 12, background: "#fff", marginTop: 6 }} />
                </figure>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
