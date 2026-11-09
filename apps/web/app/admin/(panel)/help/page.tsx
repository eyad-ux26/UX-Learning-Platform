import { requireAdmin } from "@/lib/admin/guard";
import { Card, PageHead } from "@/components/admin/ui";

export const metadata = { title: "Help and shortcuts" };

export default async function HelpPage() {
  await requireAdmin();
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Help and shortcuts" }]} title="Help and shortcuts" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Card title="Keyboard">
          <dl className="a-kv">
            <dt><span className="a-kbd">Ctrl</span> <span className="a-kbd">K</span> or <span className="a-kbd">⌘</span> <span className="a-kbd">K</span></dt><dd>Search everything</dd>
            <dt><span className="a-kbd">Tab</span></dt><dd>Move between controls; every action works from the keyboard</dd>
            <dt><span className="a-kbd">Esc</span></dt><dd>Close a dialog or menu</dd>
          </dl>
        </Card>
        <Card title="How the panel keeps things safe">
          <ul className="t-sm ink-2" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Personal data is masked. Reveal asks for a reason the first time in a session, and every reveal is logged.</li>
            <li>Risky actions show their effects, ask for a reason and are logged. Some need a fresh authenticator code (within 10 minutes).</li>
            <li>Big refunds and super admin grants need a second person or a 24-hour wait.</li>
            <li>Sessions end after 30 minutes idle or 12 hours in total.</li>
            <li>Payments change only through Paddle and Paymob. The panel never shows card numbers or secret keys.</li>
          </ul>
        </Card>
        <Card title="Times and money">
          <p className="t-sm ink-2">Times are in Cairo time; hover a time to see UTC. Amounts show their own currency, with the USD value at a fixed rate whose date shows on hover.</p>
        </Card>
      </div>
    </main>
  );
}
