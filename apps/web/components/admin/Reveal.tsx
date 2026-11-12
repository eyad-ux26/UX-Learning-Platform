"use client";
// A masked value with "Reveal": asks why, then shows the real value. The server logs the reveal with the reason.
import { useId, useRef } from "react";
import { Feedback, useKeptForm, type Action } from "./forms";

export function Reveal({ action, masked, user, field }: { action: Action; masked: string; user: string; field: "email" | "ip" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const { state, pending, ref: form, onSubmit } = useKeptForm(action);
  const value = state?.ok ? (state.data as { value?: string } | undefined)?.value : null;
  if (value) return <span className="a-mask"><span className="v">{value}</span><span className="a-revealed"><span className="i i-eye" aria-hidden="true" />Revealed, logged</span></span>;
  return (
    <span className="a-mask">
      <span className="v">{masked}</span>
      <button type="button" className="a-reveal" onClick={() => ref.current?.showModal()}><span className="i i-eye" aria-hidden="true" />Reveal</button>
      <dialog ref={ref} className="a-dialog" aria-labelledby={`${id}-h`}>
        <form ref={form} onSubmit={onSubmit}>
          <div className="a-dlg-h"><span className="ic"><span className="i i-eye" aria-hidden="true" /></span><div><h3 className="t-h2" id={`${id}-h`}>Reveal the {field === "ip" ? "last IP address" : "email address"}?</h3><p className="t-sm ink-2">Your name, the time and the reason go in the audit log.</p></div></div>
          <div className="a-dlg-b a-stack">
            <input type="hidden" name="user" value={user} /><input type="hidden" name="field" value={field} />
            <div className="a-field"><label htmlFor={`${id}-r`}>Reason<span className="req" aria-hidden="true">*</span></label><input id={`${id}-r`} name="reason" className="a-in" required minLength={3} maxLength={300} placeholder="Ticket #1042, checking the sign-in email" /></div>
            <Feedback state={state && !state.ok ? state : null} />
          </div>
          <div className="a-dlg-f"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button><button type="submit" className="a-btn pri" disabled={pending} aria-busy={pending}>{pending ? "Working…" : "Reveal"}</button></div>
        </form>
      </dialog>
    </span>
  );
}
