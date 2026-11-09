"use client";
// The ticket composer (SUP-4, SUP-5): reply in English or Arabic (written right to left), or an internal note.
// A macro fills the text for this learner and can run actions when the reply is sent.
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Feedback, type Action, type Result } from "./forms";

export type MacroOption = { id: string; title: string; category: string; actions: string[]; en: string; ar: string };

const ACTION_LABEL: Record<string, string> = { resend_signin: "Resend sign-in link", "status:waiting_learner": "Status: Waiting on learner", "status:resolved": "Status: Resolved" };

export function Composer({ action, ticket, lang: lang0, macros, canNote = true }: { action: Action; ticket: number; lang: "en" | "ar"; macros: MacroOption[]; canNote?: boolean }) {
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [lang, setLang] = useState<"en" | "ar">(lang0);
  const [macro, setMacro] = useState<MacroOption | null>(null);
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState<Result | null, FormData>(action, null);
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (state?.ok) { setText(""); setMacro(null); router.refresh(); }
  }, [state, router]);
  const pick = (id: string) => {
    const m = macros.find((x) => x.id === id) ?? null;
    setMacro(m);
    if (m) setText(lang === "ar" ? m.ar : m.en);
    ref.current?.focus();
  };
  const switchLang = (l: "en" | "ar") => {
    setLang(l);
    if (macro && (text === macro.en || text === macro.ar)) setText(l === "ar" ? macro.ar : macro.en);
  };
  const statusFromMacro = macro?.actions.find((a) => a.startsWith("status:"))?.slice(7);
  return (
    <form action={formAction} className="a-composer" aria-label="Reply">
      <input type="hidden" name="ticket" value={ticket} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="lang" value={lang} />
      {macro && mode === "reply" ? <input type="hidden" name="macro" value={macro.id} /> : null}
      <div className="bar">
        <span className="a-seg" role="group" aria-label="Message type">
          <button type="button" aria-pressed={mode === "reply"} onClick={() => setMode("reply")}>Reply to learner</button>
          {canNote ? <button type="button" aria-pressed={mode === "note"} onClick={() => setMode("note")}>Internal note</button> : null}
        </span>
        {mode === "reply" ? (
          <>
            <span className="t-xs ink-3" style={{ marginInlineStart: 8 }}>Reply language</span>
            <span className="a-seg" role="group" aria-label="Reply language">
              <button type="button" aria-pressed={lang === "en"} onClick={() => switchLang("en")}>English</button>
              <button type="button" aria-pressed={lang === "ar"} onClick={() => switchLang("ar")} lang="ar">العربية</button>
            </span>
            <label className="a-row t-sm" style={{ gap: 6, marginInlineStart: "auto" }}>
              <span className="ink-2">Macros</span>
              <select className="a-in" value={macro?.id ?? ""} onChange={(e) => pick(e.target.value)} style={{ width: "auto", height: 30 }}>
                <option value="">Choose a saved reply…</option>
                {macros.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </label>
          </>
        ) : null}
      </div>
      <div className="ed" style={mode === "note" ? { background: "var(--warn-bg)" } : undefined}>
        <label htmlFor={`cmp-${ticket}`} className="sr">{mode === "note" ? "Internal note" : "Reply"}</label>
        <textarea ref={ref} id={`cmp-${ticket}`} name="body" className="a-ta" rows={7} required maxLength={20000} value={text} onChange={(e) => setText(e.target.value)}
          dir={mode === "reply" && lang === "ar" ? "rtl" : "auto"} lang={mode === "reply" ? lang : undefined} style={{ border: 0, minHeight: 140 }}
          placeholder={mode === "note" ? "Only the team sees this. Type @ and a name to mention someone." : lang === "ar" ? "اكتب ردّك هنا، أو اختر ردًّا جاهزًا" : "Write your reply, or choose a saved reply"} />
      </div>
      {macro && mode === "reply" && macro.actions.length ? (
        <div className="bar t-sm"><b>This macro will also:</b>{macro.actions.map((a) => <span key={a} className="a-act-chip">{ACTION_LABEL[a] ?? a}</span>)}</div>
      ) : null}
      <div className="ft">
        {mode === "reply" ? (
          <label className="a-row t-sm" style={{ gap: 6 }}>
            <span className="ink-2">Then set status</span>
            <select name="status" className="a-in" defaultValue={statusFromMacro ?? "waiting_learner"} key={statusFromMacro ?? "x"} style={{ width: "auto", height: 30 }}>
              <option value="waiting_learner">Waiting on learner</option><option value="open">Open</option><option value="waiting_team">Waiting on team</option><option value="resolved">Resolved</option>
            </select>
          </label>
        ) : null}
        <span className="t-xs ink-3 a-grow">{mode === "reply" ? "From support@uxgate.org · UXGate template" : "Not sent to the learner"}</span>
        <button type="submit" className="a-btn pri" disabled={pending || !text.trim()} aria-busy={pending}>{pending ? "Sending…" : mode === "note" ? "Add note" : macro?.actions.some((a) => !a.startsWith("status:")) ? "Send and run actions" : "Send"}</button>
      </div>
      <div style={{ padding: "0 8px 8px" }}><Feedback state={state} /></div>
    </form>
  );
}

/** A select that saves as soon as it changes (ticket status, priority, assignee...). */
export function AutoSelect({ action, ticket, field, value, label, options }: { action: Action; ticket: number; field: string; value: string; label: string; options: [string, string][] }) {
  const [state, formAction, pending] = useActionState<Result | null, FormData>(action, null);
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  return (
    <form ref={form} action={formAction} className="a-field" style={{ gap: 2 }}>
      <input type="hidden" name="ticket" value={ticket} /><input type="hidden" name="field" value={field} />
      <label className="t-xs ink-2" htmlFor={`as-${field}-${ticket}`}>{label}</label>
      <select id={`as-${field}-${ticket}`} name="value" className="a-in" defaultValue={value} disabled={pending} onChange={() => form.current?.requestSubmit()} style={{ height: 32 }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {state && !state.ok ? <span className="a-err t-xs" role="alert">{state.error}</span> : null}
    </form>
  );
}
