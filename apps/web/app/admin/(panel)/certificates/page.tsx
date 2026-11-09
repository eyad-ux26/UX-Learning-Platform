import Link from "next/link";
import { content } from "@uxgate/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { learnerIds, people } from "@/lib/admin/data/billing";
import { pathTitle } from "@/lib/admin/data/learners";
import { certId } from "@/lib/certificate-share";
import { siteOrigin } from "@/lib/server/email/layout";
import { Card, Empty, Filters, Id, KV, NoAccess, Note, PageHead, St, When, Who } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { reissueCertificate, revokeCertificate } from "./actions";
import { REVOKE_REASONS } from "@/lib/admin/rules";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificates" };

type Row = { code: string; path_id: string; user_id: string; issued_at: string; revoked_at: string | null; revoked_reason: { en?: string } | null; reissued_at: string | null; public_changed_at: string | null };

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "certs.view")) return <NoAccess what="Certificates" roles="a support or admin role" />;
  const sp = await searchParams;
  const db = createAdminClient();
  const q = (sp.q ?? "").trim();
  let query = db.from("certificates").select("code, path_id, user_id, issued_at, revoked_at, revoked_reason, reissued_at, public_changed_at");
  const m = q.match(/^(?:UXG-)?(?:(P\d{2})-)?([0-9A-Fa-f]{4,12})$/i);
  if (m) {
    if (m[1]) query = query.eq("path_id", m[1].toUpperCase());
    query = query.like("code", `${m[2]!.toLowerCase()}%`);
  } else if (/^UXG-P\d{2}/i.test(q)) query = query.eq("path_id", q.slice(4, 7).toUpperCase());
  else if (q) {
    const ids = await learnerIds(q);
    query = query.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (sp.path) query = query.eq("path_id", sp.path);
  if (sp.status === "valid") query = query.is("revoked_at", null);
  if (sp.status === "revoked") query = query.not("revoked_at", "is", null);
  const [{ data }, counts] = await Promise.all([
    query.order("issued_at", { ascending: false }).limit(100),
    Promise.all([
      db.from("certificates").select("code", { count: "exact", head: true }),
      db.from("certificates").select("code", { count: "exact", head: true }).not("revoked_at", "is", null),
      db.from("certificates").select("code", { count: "exact", head: true }).not("reissued_at", "is", null),
    ]).then((r) => r.map((x) => x.count ?? 0)),
  ]);
  const rows = (data ?? []) as Row[];
  const who = await people(rows.map((r) => r.user_id));
  const sel = rows.find((r) => r.code === sp.code) ?? (rows.length === 1 ? rows[0] : null);
  const canManage = allowed(ctx, "certs.manage");
  const keep = (code: string) => `/admin/certificates?${new URLSearchParams({ ...(q ? { q } : {}), ...(sp.path ? { path: sp.path } : {}), ...(sp.status ? { status: sp.status } : {}), code }).toString()}`;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Grow" }, { label: "Certificates" }]} title="Certificates" sub={`${counts[0]!.toLocaleString("en")} issued · ${counts[1]} revoked · ${counts[2]} re-issued`} />
      <div className="a-split">
        <div className="a-main-col">
          <Card label="Certificates" pad={false}>
            <Filters action="/admin/certificates" q={sp.q} placeholder="Certificate id (UXG-P01-…), learner or email" selects={[
              { name: "path", label: "Path", value: sp.path, options: content.paths.map((p) => [p.id, `${p.id} ${p.title.en}`]) },
              { name: "status", label: "Status", value: sp.status, options: [["valid", "Valid"], ["revoked", "Revoked"]] },
            ]} />
            {rows.length ? (
              <div className="a-tbl-wrap"><table className="a-tbl">
                <thead><tr><th scope="col">Certificate id</th><th scope="col">Learner</th><th scope="col">Path</th><th scope="col">Issued</th><th scope="col">Status</th></tr></thead>
                <tbody>{rows.map((r) => {
                  const p = who.get(r.user_id);
                  return (
                    <tr key={r.code} aria-selected={sel?.code === r.code ? "true" : undefined}>
                      <td><Link href={keep(r.code)}><Id>{certId(r.path_id, r.code)}</Id></Link></td>
                      <td><Who id={r.user_id} name={p?.display_name} email={p?.email} /></td>
                      <td>{r.path_id} · {pathTitle(r.path_id)}</td><td><When at={r.issued_at} /></td>
                      <td>{r.revoked_at ? <St tone="bad">Revoked</St> : r.reissued_at ? <St tone="good">Valid · re-issued</St> : <St tone="good">Valid</St>}</td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            ) : <Empty icon="certificate" title="No certificates match" />}
          </Card>
        </div>
        <aside className="a-rail" aria-label="Certificate">
          {sel ? (() => {
            const id = certId(sel.path_id, sel.code);
            const p = who.get(sel.user_id);
            const url = `${siteOrigin()}/en/c/${sel.code}`;
            return (
              <>
                <div className="a-rail-s"><b className="t-sm">Certificate</b>
                  <div className="a-card-b" style={{ textAlign: "center", border: "1px solid var(--line)", borderRadius: 8 }}>
                    <span className="t-over">UXGate certificate</span>
                    <div className="t-h3">{p?.display_name ?? "Learner"}</div>
                    <div className="a-ar">{pathTitle(sel.path_id, "ar")}</div>
                    <div className="t-sm">{pathTitle(sel.path_id)} · <When at={sel.issued_at} /></div>
                  </div>
                  <KV rows={[
                    ["Id", <Id key="i">{id}</Id>],
                    ["Status", sel.revoked_at ? <St tone="bad">Revoked <When at={sel.revoked_at} /></St> : <St tone="good">Valid</St>],
                    ["Public page", <a key="u" href={url} target="_blank" rel="noreferrer noopener" className="t-sm">{url.replace(/^https?:\/\//, "")}</a>],
                    ["Shown reason", sel.revoked_reason?.en ?? null],
                    ["Re-issued", sel.reissued_at ? <When at={sel.reissued_at} /> : null],
                  ]} />
                </div>
                {canManage && !sel.revoked_at ? (
                  <div className="a-rail-s"><b className="t-sm">Actions</b>
                    <Confirm action={reissueCertificate} label="Re-issue with a new name" title={`Re-issue ${id}?`} small icon="pencil-simple" hidden={[{ name: "code", value: sel.code }]}
                      effects={[{ icon: "check", text: "Same id and date. Only the name changes, here and on their profile." }, { icon: "share-network", text: "The share preview refreshes, so LinkedIn shows the new name." }]}>
                      <div className="a-field"><label htmlFor="ri-name">Name on the certificate</label><input id="ri-name" name="name" className="a-in" defaultValue={p?.display_name ?? ""} maxLength={60} dir="auto" />
                        <span className="help">Leave it as it is to only refresh the share preview.</span></div>
                    </Confirm>
                    <Confirm action={revokeCertificate} label="Revoke" title={`Revoke ${id}?`} small danger icon="prohibit" typed={id} hidden={[{ name: "code", value: sel.code }]}
                      sub={`${p?.display_name ?? "Learner"} · ${pathTitle(sel.path_id)} · issued ${new Date(sel.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                      reasonLabel="Note for the team (saved in the audit log)"
                      effects={[{ icon: "globe", text: "The public page stays, and says “No longer valid” in English and Arabic with the reason below." }, { icon: "envelope-simple", text: "The learner gets an email in their language." }, { icon: "clipboard-text", text: "Logged with your name. It cannot be undone from the panel." }]}>
                      <fieldset className="a-field" style={{ border: 0, padding: 0, margin: 0 }}>
                        <legend className="t-sm w6" style={{ marginBottom: 6 }}>Reason shown on the public page<span className="req" aria-hidden="true">*</span></legend>
                        {Object.entries(REVOKE_REASONS).map(([k, v], i) => <label key={k} className="a-row t-sm" style={{ gap: 6 }}><input type="radio" name="public" value={k} defaultChecked={i === 0} required />{v.en} <span className="a-ar t-xs" dir="rtl" lang="ar">{v.ar}</span></label>)}
                      </fieldset>
                    </Confirm>
                    <p className="t-xs ink-3">Re-issue keeps the same id and date and changes only the name. Revoke shows “no longer valid” on the public page with the reason you choose.</p>
                  </div>
                ) : null}
              </>
            );
          })() : <div className="a-rail-s"><Note>Pick a certificate to see it and its actions.</Note></div>}
        </aside>
      </div>
    </main>
  );
}
