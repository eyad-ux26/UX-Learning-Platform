import { allowed, requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskEmail } from "@/lib/admin/mask";
import { Card, Empty, NoAccess, Note, PageHead, When } from "@/components/admin/ui";
import { CommsTabs } from "@/components/admin/CommsTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Launch list" };

/** COM-4: the Coming Soon launch list. Addresses are shown masked; confirmed ones get the launch-day email. */
export default async function WaitlistPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "comms.view")) return <NoAccess what="Communications" roles="a marketing or admin role" />;
  const db = createAdminClient();
  const c = async (q: (b: ReturnType<typeof base>) => ReturnType<typeof base>) => (await q(base())).count ?? 0;
  const base = () => db.from("waitlist").select("id", { count: "exact", head: true });
  const [all, confirmed, ar, recent] = await Promise.all([
    c((b) => b), c((b) => b.not("consent_at", "is", null)), c((b) => b.not("consent_at", "is", null).eq("locale", "ar")),
    db.from("waitlist").select("email, locale, consent_at, source, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Grow" }, { label: "Communications" }]} title="Communications" sub="Banners in the learner app, emails to learners, and the emails the app sends by itself." />
      <CommsTabs current="waitlist" />
      {recent.error ? <Note icon="warning">The launch list table is not in this database.</Note> : null}
      <div className="a-kpis">
        <div className="a-kpi"><span className="t-xs ink-2">Joined</span><b className="num">{all.toLocaleString("en")}</b></div>
        <div className="a-kpi"><span className="t-xs ink-2">Confirmed from their inbox</span><b className="num">{confirmed.toLocaleString("en")}</b></div>
        <div className="a-kpi"><span className="t-xs ink-2">Confirmed, Arabic</span><b className="num">{ar.toLocaleString("en")}</b></div>
        <div className="a-kpi"><span className="t-xs ink-2">Confirmed, English</span><b className="num">{(confirmed - ar).toLocaleString("en")}</b></div>
      </div>
      <Note>Unconfirmed addresses are removed after 30 days. Only confirmed ones get the launch-day email. Addresses are masked here; nobody exports the list from the panel.</Note>
      <Card label="Latest" title="Latest 50" pad={false}>
        {recent.data?.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Address</th><th scope="col">Language</th><th scope="col">From</th><th scope="col">Joined</th><th scope="col">Confirmed</th></tr></thead>
            <tbody>{recent.data.map((w, i) => (
              <tr key={i}><td className="a-code t-sm">{maskEmail(w.email as string)}</td><td className="t-sm">{w.locale === "ar" ? "Arabic" : "English"}</td><td className="t-sm">{(w.source as string) ?? "—"}</td>
                <td className="t-sm"><When at={w.created_at as string} rel /></td><td className="t-sm">{w.consent_at ? <When at={w.consent_at as string} rel /> : <span className="ink-3">Not yet</span>}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <Empty icon="tray" title="Nobody on the list yet" />}
      </Card>
    </main>
  );
}
