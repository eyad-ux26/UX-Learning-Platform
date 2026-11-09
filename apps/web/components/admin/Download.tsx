"use client";
// A risky export: asks for a reason (and a fresh code when needed), then saves the file the server action returns.
import { useActionState, useEffect, useRef } from "react";
import { CodeField, Feedback, type Action, type Result } from "./forms";

export function ExportButton({ action, label, title, hidden = [], fresh, note }: { action: Action; label: string; title: string; hidden?: { name: string; value: string }[]; fresh: boolean; note?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState<Result | null, FormData>(action, null);
  useEffect(() => {
    if (state?.ok && state.data && typeof state.data === "object" && "csv" in state.data) {
      const d = state.data as { csv: string; name: string };
      const url = URL.createObjectURL(new Blob([d.csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = d.name; a.click();
      URL.revokeObjectURL(url);
      ref.current?.close();
    }
  }, [state]);
  return (
    <>
      <button type="button" className="a-btn" onClick={() => ref.current?.showModal()}><span className="i i-download-simple" aria-hidden="true" />{label}</button>
      <dialog ref={ref} className="a-dialog" aria-label={title}>
        <form action={formAction}>
          <div className="a-dlg-h"><span className="ic"><span className="i i-download-simple" aria-hidden="true" /></span><div><h3 className="t-h2">{title}</h3>{note ? <p className="t-sm ink-2">{note}</p> : null}</div></div>
          <div className="a-dlg-b a-stack">
            {hidden.map((h) => <input key={h.name} type="hidden" name={h.name} value={h.value} />)}
            <div className="a-field"><label htmlFor="exp-reason">Reason (saved in the audit log)<span className="req" aria-hidden="true">*</span></label><textarea id="exp-reason" name="reason" className="a-ta" rows={2} required minLength={3} /></div>
            <CodeField show={!fresh || !!(state && !state.ok && state.reauth)} />
            <Feedback state={state && !state.ok ? state : null} />
          </div>
          <div className="a-dlg-f"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button><button className="a-btn pri" type="submit" disabled={pending} aria-busy={pending}>{pending ? "Preparing…" : "Export"}</button></div>
        </form>
      </dialog>
    </>
  );
}
