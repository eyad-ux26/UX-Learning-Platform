import { allowed, requireAdmin } from "@/lib/admin/guard";
import { people, studentChecks } from "@/lib/admin/data/billing";
import { maskEmail } from "@/lib/admin/mask";
import { Card, Empty, NoAccess, Note, PageHead, St, When, Who } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { approveStudent, endStudent } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Student checks" };

export default async function StudentChecksPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "students.review")) return <NoAccess what="Student checks" roles="a billing or support lead role" />;
  const sp = await searchParams;
  const rows = await studentChecks();
  const who = await people([...rows.map((r) => r.user_id), sp.user]);
  const now = Date.now();
  const target = sp.user && /^[0-9a-f-]{36}$/i.test(sp.user) ? who.get(sp.user) : null;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { href: "/admin/billing/discounts", label: "Discounts" }, { label: "Student checks" }]} title="Student checks"
        sub="A university email passes on its own. A learner without one sends a student card or enrolment letter to support; check it there, then turn on the student price here." />
      <Note icon="info">Student card uploads in the app are not built yet. Until they are, proof arrives as a reply to support@uxgate.org. Approving turns on 40% off Pro monthly or annual for a year, with no code needed.</Note>
      {target ? (
        <Card title="Approve the student price">
          <div className="a-row" style={{ gap: 12, justifyContent: "space-between" }}>
            <Who id={sp.user} name={target.display_name} email={target.email} />
            <Confirm action={approveStudent} label="Approve student price" title="Turn on the student price for a year?" icon="student" hidden={[{ name: "user", value: sp.user! }]}
              reasonLabel="What you checked (saved in the audit log)"
              effects={[{ icon: "check", text: "Name matches the account, the card is for this school year or later, and the school is real." }, { icon: "tag", text: "40% off Pro monthly or annual at checkout, for a year." }]} />
          </div>
        </Card>
      ) : null}
      <Card label="Student checks" pad={false}>
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Learner</th><th scope="col">Checked email</th><th scope="col">State</th><th scope="col">Valid until</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{rows.map((r) => {
              const p = who.get(r.user_id);
              const valid = r.valid_until && new Date(r.valid_until).getTime() > now;
              return (
                <tr key={r.user_id}>
                  <td><Who id={r.user_id} name={p?.display_name} email={p?.email} /></td>
                  <td>{maskEmail(r.email)}</td>
                  <td>{valid ? <St tone="good">Student price on</St> : r.verified_at ? <St tone="off">Expired</St> : r.expires_at && new Date(r.expires_at).getTime() > now ? <St tone="wait">Link sent <When at={r.sent_at} rel /></St> : <St tone="off">Link not used</St>}</td>
                  <td><When at={r.valid_until} /></td>
                  <td>{valid ? <Confirm action={endStudent} label="End" title="End the student price?" small ghost hidden={[{ name: "user", value: r.user_id }]}
                    effects={[{ icon: "minus-circle", text: "New checkouts and renewals stop getting 40% off." }]} /> : null}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="student" title="No student checks yet" />}
      </Card>
      <p className="t-xs ink-3">To approve someone from a ticket, open their Learner 360 and use “Approve student price”.</p>
    </main>
  );
}
