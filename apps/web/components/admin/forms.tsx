"use client";
// Admin forms: every change goes through a server action that checks the admin's permission again. Risky actions open
// a confirm dialog that names the effects, asks for a reason and, when the last authenticator check is older than 10
// minutes, for a fresh 6-digit code (requirements: "Safeguards").
import { useActionState, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

export type Result = { ok: true; data?: unknown; message?: string } | { ok: false; error: string; reauth?: boolean };
export type Action = (prev: Result | null, form: FormData) => Promise<Result>;

const Icon = ({ n }: { n: string }) => <span className={`i i-${n}`} aria-hidden="true" />;

export function Feedback({ state }: { state: Result | null }) {
  if (!state) return null;
  if (state.ok) return state.message ? <p className="a-ok" role="status"><Icon n="check-circle-fill" />{state.message}</p> : null;
  return <p className="a-err" role="alert"><Icon n="warning" />{state.error}</p>;
}

/** The 6-digit code field used for re-authentication. */
export function CodeField({ show }: { show: boolean }) {
  const id = useId();
  if (!show) return null;
  return (
    <div className="a-field">
      <label htmlFor={id}>Code from your authenticator app<span className="req" aria-hidden="true">*</span></label>
      <input id={id} name="code" className="a-in" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required placeholder="123 456" />
      <span className="help">Needed because this is a risky action and your last check was more than 10 minutes ago.</span>
    </div>
  );
}

type Field = { name: string; value: string };

/**
 * A button that opens a confirm dialog for one action. `effects` lists what will happen. `reason` asks why (logged).
 * `typed` asks the admin to type a word or id exactly. `fresh` is false when a new authenticator code is needed.
 */
export function Confirm({
  action, label, title, sub, effects = [], hidden = [], reason = true, reasonLabel = "Reason (saved in the audit log)", typed, fresh = true,
  danger = false, small = false, ghost = false, icon, confirmLabel, children, disabled, refresh = true, go,
}: {
  action: Action; label: string; title: string; sub?: string; effects?: { icon: string; text: ReactNode }[]; hidden?: Field[]; reason?: boolean;
  reasonLabel?: string; typed?: string; fresh?: boolean; danger?: boolean; small?: boolean; ghost?: boolean; icon?: string; confirmLabel?: string;
  children?: ReactNode; disabled?: boolean | string; refresh?: boolean;
  /** Where to go after it worked (instead of staying on the page). */
  go?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [state, formAction, pending] = useActionState<Result | null, FormData>(action, null);
  const [typedOk, setTypedOk] = useState(!typed);
  const router = useRouter();
  const needCode = !fresh || (state && !state.ok && state.reauth);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.close();
      if (go) router.push(go);
      else if (refresh) router.refresh();
    }
  }, [state, refresh, router, go]);
  const cls = `a-btn${small ? " sm" : ""}${danger ? " danger" : ""}${ghost ? " ghost" : ""}`;
  return (
    <>
      <button type="button" className={cls} onClick={() => ref.current?.showModal()} disabled={!!disabled} title={typeof disabled === "string" ? disabled : undefined}>
        {icon ? <Icon n={icon} /> : null}{label}
      </button>
      {state?.ok ? <Done state={state} /> : null}
      <dialog ref={ref} className="a-dialog" aria-labelledby={`dlg-${uid}`}>
        <form action={formAction}>
          <div className="a-dlg-h">
            <span className={`ic${danger ? " bad" : ""}`}><Icon n={icon ?? (danger ? "warning" : "check")} /></span>
            <div><h3 className="t-h2" id={`dlg-${uid}`}>{title}</h3>{sub ? <p className="t-sm ink-2">{sub}</p> : null}</div>
          </div>
          <div className="a-dlg-b a-stack">
            {effects.length ? <ul className="a-effects">{effects.map((e, i) => <li key={i}><Icon n={e.icon} />{e.text}</li>)}</ul> : null}
            {children}
            {hidden.map((h) => <input key={h.name} type="hidden" name={h.name} value={h.value} />)}
            {reason ? (
              <div className="a-field">
                <label htmlFor={`rsn-${uid}`}>{reasonLabel}<span className="req" aria-hidden="true">*</span></label>
                <textarea id={`rsn-${uid}`} name="reason" className="a-ta" required minLength={3} maxLength={500} rows={2} />
              </div>
            ) : null}
            {typed ? (
              <div className="a-field">
                <label htmlFor={`typed-${uid}`}>Type <b className="a-code">{typed}</b> to confirm</label>
                <input id={`typed-${uid}`} name="typed" className="a-in" autoComplete="off" onChange={(e) => setTypedOk(e.target.value.trim() === typed)} />
              </div>
            ) : null}
            <CodeField show={!!needCode} />
            <Feedback state={state && !state.ok ? state : null} />
          </div>
          <div className="a-dlg-f">
            <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className={`a-btn ${danger ? "danger-solid" : "pri"}`} disabled={pending || !typedOk} aria-busy={pending}>
              {pending ? "Working…" : confirmLabel ?? label}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/**
 * An inline form (no dialog) bound to a server action, for low-risk edits such as a note or a ticket reply. Server pages
 * use it, so its children are plain elements (a function child cannot cross from a server page to a client component);
 * use <Submit> inside it for a button that shows the pending state.
 */
export function ActionForm({ action, children, className, reset = true, refresh = true }: { action: Action; children: ReactNode; className?: string; reset?: boolean; refresh?: boolean }) {
  const [state, formAction] = useActionState<Result | null, FormData>(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (reset) ref.current?.reset();
      if (refresh) router.refresh();
    }
  }, [state, reset, refresh, router]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <CodeField show={!!(state && !state.ok && state.reauth)} />
      <Feedback state={state} />
    </form>
  );
}

/** The submit button of the form it sits in: disabled and busy while the form's action runs. */
export function Submit({ className = "a-btn sm", busy, children, style }: { className?: string; busy?: string; children: ReactNode; style?: CSSProperties }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending} aria-busy={pending} style={style}>{pending && busy ? busy : children}</button>;
}

/** What a dialog's action reports after it worked: its message, and a value to copy when it returned one. */
function Done({ state }: { state: Extract<Result, { ok: true }> }) {
  const copy = (state.data as { copy?: { label: string; value: string } } | undefined)?.copy;
  const [copied, setCopied] = useState(false);
  if (!state.message && !copy) return null;
  return (
    <span className="a-col" style={{ gap: 4 }}>
      {state.message ? <span className="a-ok t-xs" role="status"><Icon n="check-circle-fill" />{state.message}</span> : null}
      {copy ? (
        <span className="a-row" style={{ gap: 6 }}>
          <input className="a-in" readOnly value={copy.value} aria-label={copy.label} title={copy.label} onFocus={(e) => e.currentTarget.select()} style={{ minWidth: 0, flex: 1 }} />
          <button type="button" className="a-btn sm" onClick={() => { void navigator.clipboard?.writeText(copy.value).then(() => setCopied(true)); }}>{copied ? "Copied" : "Copy link"}</button>
        </span>
      ) : null}
    </span>
  );
}

/** A drawer (right side panel) with a form inside, for longer forms such as inviting a team member. */
export function Drawer({ label, title, icon, primary = false, children, action, submit, fresh = true }: {
  label: string; title: string; icon?: string; primary?: boolean; children: ReactNode; action: Action; submit: string; fresh?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [state, formAction, pending] = useActionState<Result | null, FormData>(action, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) { ref.current?.close(); router.refresh(); }
  }, [state, router]);
  return (
    <>
      <button type="button" className={`a-btn${primary ? " pri" : ""}`} onClick={() => ref.current?.showModal()}>{icon ? <Icon n={icon} /> : null}{label}</button>
      {state?.ok ? <Done state={state} /> : null}
      <dialog ref={ref} className="a-drawer" aria-labelledby={`drw-${uid}`}>
        <form action={formAction} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="a-drw-h"><h2 className="t-h2 a-grow" id={`drw-${uid}`}>{title}</h2><button type="button" className="a-btn sm icon ghost" aria-label="Close" onClick={() => ref.current?.close()}><Icon n="x" /></button></div>
          <div className="a-drw-b a-stack">
            {children}
            <CodeField show={!fresh || !!(state && !state.ok && state.reauth)} />
            <Feedback state={state && !state.ok ? state : null} />
          </div>
          <div className="a-drw-f"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button><button type="submit" className="a-btn pri" disabled={pending} aria-busy={pending}>{pending ? "Working…" : submit}</button></div>
        </form>
      </dialog>
    </>
  );
}
