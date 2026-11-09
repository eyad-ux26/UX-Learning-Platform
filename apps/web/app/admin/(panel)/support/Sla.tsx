import { fmtDuration } from "@/lib/admin/format";
import type { Ticket } from "@/lib/admin/data/support";

/** "First reply due in 1 h 16 min", amber when close, red once late (SUP-7). */
export function Sla({ t, warnMinutes = 120 }: { t: Pick<Ticket, "status" | "first_reply_due" | "first_replied_at" | "resolve_due">; warnMinutes?: number }) {
  if (["resolved", "closed"].includes(t.status)) return null;
  const first = !t.first_replied_at;
  const due = first ? t.first_reply_due : t.status === "waiting_learner" ? null : t.resolve_due;
  if (!due) return null;
  const left = (new Date(due).getTime() - Date.now()) / 1000;
  const what = first ? "First reply" : "Resolve";
  if (left < 0) return <span className="a-sla late"><span className="i i-warning" aria-hidden="true" />{what} late by {fmtDuration(-left)}</span>;
  return <span className={`a-sla${left < warnMinutes * 60 ? " soon" : ""}`}><span className="i i-clock" aria-hidden="true" />{what} due in {fmtDuration(left)}</span>;
}
