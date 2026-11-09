import Link from "next/link";
import { requireAdmin, allowed } from "@/lib/admin/guard";
import { HIGH_REVEAL, LOW_RIGHT, MIN_TRIES, qualityList } from "@/lib/admin/data/quality";
import { names } from "@/lib/admin/data/content";
import { REASON_LABEL } from "@/lib/admin/data/appeals";
import { Card, Empty, Id, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { ContentTabs, QUALITY_STATUS } from "@/components/admin/ContentTabs";
import { setQualityStatus } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content quality" };

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const WHY = { numbers: "Few right first time", reveals: "Many reveal the answer", learners: "Learners reported it" } as const;

/** QLT-1 and QLT-2: steps that need a look, from the numbers and from learner reports, with what the team decided. */
export default async function QualityPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "quality.view", "content.view")) return <NoAccess what="Content quality" roles="a content role" />;
  const { rows, ready } = await qualityList();
  const who = await names(rows.map((r) => r.flag?.updated_by).filter(Boolean) as string[]);
  const canEdit = allowed(ctx, "content.edit", "quality.manage");
  const canClose = allowed(ctx, "quality.manage");
  const open = rows.filter((r) => !r.flag || !["fixed", "wont_fix"].includes(r.flag.status)).length;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Content", href: "/admin/content" }, { label: "Quality" }]} title="Content quality"
        sub={`Steps worth a look in the last 90 days: fewer than ${Math.round(LOW_RIGHT * 100)}% right first time (after ${MIN_TRIES} tries), more than ${Math.round(HIGH_REVEAL * 100)}% revealing the answer, or reported by learners.`} />
      <ContentTabs current="quality" />
      {!ready ? <Note icon="warning">Migration 0063 is not in the database yet. Candidates show, but decisions cannot be saved.</Note> : null}
      <div className="a-kpis">
        <div className="a-kpi"><span className="t-xs ink-2">Open</span><b className="num">{open}</b></div>
        <div className="a-kpi"><span className="t-xs ink-2">Fixed</span><b className="num">{rows.filter((r) => r.flag?.status === "fixed").length}</b></div>
        <div className="a-kpi"><span className="t-xs ink-2">Won&apos;t fix</span><b className="num">{rows.filter((r) => r.flag?.status === "wont_fix").length}</b></div>
      </div>
      <Card label="Steps" pad={false}>
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Step</th><th scope="col">Why</th><th scope="col" className="num">Right first time</th><th scope="col" className="num">Reveals</th><th scope="col" className="num">Reports</th><th scope="col">Status</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{rows.map((r) => {
              const st = r.flag ? QUALITY_STATUS[r.flag.status] : null;
              const source = r.why.includes("learners") ? "learners" : r.why.length ? "numbers" : "team";
              const hidden = [{ name: "lesson", value: r.lessonId }, { name: "step", value: r.stepId }, { name: "source", value: source }];
              const top = r.stat ? Object.entries(r.stat.misconceptions).slice(0, 3).map(([m]) => m) : [];
              return (
                <tr key={`${r.lessonId}-${r.stepId}`}>
                  <td style={{ maxWidth: 300 }}><Link href={`/admin/content/lessons/${r.lessonId}`}><Id>{r.lessonId}</Id> <Id>{r.stepId}</Id></Link><span className="t-xs ink-2" style={{ display: "block" }}>{r.lessonTitle}</span>{top.length ? <span className="t-xs ink-3" style={{ display: "block" }}>Misconceptions: {top.join(", ")}</span> : null}</td>
                  <td className="t-sm">{r.why.map((w) => <span key={w} style={{ display: "block" }}>{WHY[w]}</span>)}{!r.why.length ? <span className="ink-3">Added by the team</span> : null}</td>
                  <td className="num">{r.stat ? pct(r.stat.first_right, r.stat.first_tries) : "—"}<span className="t-xs ink-2" style={{ display: "block" }}>{r.stat?.first_tries ?? 0} tries</span></td>
                  <td className="num">{r.stat ? pct(r.stat.reveals, r.stat.first_tries + r.stat.reveals) : "—"}</td>
                  <td className="num">{r.openReports ? <b>{r.openReports} open</b> : r.reports || "—"}{Object.keys(r.reasons).length ? <span className="t-xs ink-2" style={{ display: "block" }}>{Object.keys(r.reasons).map((k) => REASON_LABEL[k] ?? k).join(", ")}</span> : null}</td>
                  <td>{st ? <><St tone={st[0]} icon={st[1]}>{st[2]}</St><span className="t-xs ink-2" style={{ display: "block" }}><When at={r.flag!.updated_at} rel />{r.flag!.updated_by ? ` · ${who.get(r.flag!.updated_by) ?? ""}` : ""}</span>{r.flag!.note ? <span className="t-xs ink-2" style={{ display: "block", maxWidth: 220 }}>{r.flag!.note}</span> : null}{r.flag!.status === "fixed" && r.flag!.check_after ? <span className="t-xs ink-3" style={{ display: "block" }}>Check the numbers after <When at={r.flag!.check_after} /></span> : null}</> : <St tone="wait" icon="flag">New</St>}</td>
                  <td style={{ textAlign: "end" }}>
                    {ready && canEdit ? <div className="a-row" style={{ gap: 6, justifyContent: "end", flexWrap: "wrap" }}>
                      {r.flag?.status !== "fixing" ? <Confirm action={setQualityStatus} small ghost label="Fixing" icon="pencil-simple" title="Mark as being fixed" reason={false} hidden={[...hidden, { name: "status", value: "fixing" }]}>
                        <div className="a-field"><label htmlFor={`n-${r.lessonId}-${r.stepId}`}>Note (optional)</label><textarea id={`n-${r.lessonId}-${r.stepId}`} name="note" className="a-ta" rows={2} maxLength={1000} /></div>
                      </Confirm> : null}
                      {canClose && r.flag?.status !== "fixed" ? <Confirm action={setQualityStatus} small label="Fixed" icon="check" title="Mark as fixed" reason={false} hidden={[...hidden, { name: "status", value: "fixed" }]}
                        effects={[{ icon: "chart-bar", text: "The list reminds you to check its numbers again in a week." }]}>
                        <div className="a-field"><label htmlFor={`f-${r.lessonId}-${r.stepId}`}>What changed</label><textarea id={`f-${r.lessonId}-${r.stepId}`} name="note" className="a-ta" rows={2} maxLength={1000} /></div>
                      </Confirm> : null}
                      {canClose && r.flag?.status !== "wont_fix" ? <Confirm action={setQualityStatus} small ghost label="Won't fix" icon="minus-circle" title="Keep the step as it is" reason={false} hidden={[...hidden, { name: "status", value: "wont_fix" }]}>
                        <div className="a-field"><label htmlFor={`w-${r.lessonId}-${r.stepId}`}>Why<span className="req" aria-hidden="true">*</span></label><textarea id={`w-${r.lessonId}-${r.stepId}`} name="note" className="a-ta" rows={2} minLength={3} maxLength={1000} required /></div>
                      </Confirm> : null}
                    </div> : null}
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="flag" title="Nothing needs a look">No step is below the bar and no learner reported one in the last 90 days.</Empty>}
      </Card>
    </main>
  );
}
