"use client";
// The lesson editor (CNT-1, CNT-2; board LessonEditor). English and Arabic side by side, step by step, with the
// automatic checks live and a phone preview of the saved draft in both directions. Only words change here.
import { useMemo, useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Lesson } from "@uxgate/content/types";
import { applyEdits, behind, lessonChecks, textFields, type Edits } from "@/lib/admin/content-edit";
import { Feedback, type Action, type Result } from "./forms";

const Icon = ({ n }: { n: string }) => <span className={`i i-${n}`} aria-hidden="true" />;

export function LessonEditor({ lessonId, base, start, acks0, canEdit, frozen, save, submit, previewKey }: {
  lessonId: string; base: Lesson; start: Lesson; acks0: string[]; canEdit: boolean; frozen: boolean; save: Action; submit: Action; previewKey: string;
}) {
  const router = useRouter();
  const baseFields = useMemo(() => textFields(base), [base]);
  const startFields = useMemo(() => new Map(textFields(start).map((f) => [f.path, f])), [start]);
  const [vals, setVals] = useState<Edits>(() => Object.fromEntries(baseFields.map((f) => [f.path, { en: startFields.get(f.path)?.en ?? f.en, ar: startFields.get(f.path)?.ar ?? f.ar }])));
  const [acks, setAcks] = useState<string[]>(acks0);
  const [saved, setSaved] = useState(JSON.stringify({ vals, acks }));
  const dirty = JSON.stringify({ vals, acks }) !== saved;
  const [saveState, saveAction, saving] = useActionState<Result | null, FormData>(save, null);
  const [subState, subAction, sending] = useActionState<Result | null, FormData>(submit, null);
  const [lang, setLang] = useState<"en" | "ar">("en");

  const edits = useMemo(() => Object.fromEntries(baseFields.filter((f) => vals[f.path].en !== f.en || vals[f.path].ar !== f.ar).map((f) => [f.path, vals[f.path]])), [baseFields, vals]);
  const draft = useMemo(() => { try { return applyEdits(base, edits); } catch { return base; } }, [base, edits]);
  const { ok, checks } = useMemo(() => lessonChecks(base, draft, acks), [base, draft, acks]);
  const lag = useMemo(() => new Map(behind(base, draft, acks).map((b) => [b.path, b.behind])), [base, draft, acks]);
  const lagAll = useMemo(() => new Map(behind(base, draft, []).map((b) => [b.path, b.behind])), [base, draft]);

  useEffect(() => {
    if (saveState?.ok) { setSaved(JSON.stringify({ vals, acks })); router.refresh(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState]);
  useEffect(() => { if (subState?.ok) router.refresh(); }, [subState, router]);

  const steps = [{ id: null as string | null, label: "Lesson" }, ...base.steps.map((s, i) => ({ id: s.id, label: `${s.id} · ${s.type}${s.part ? ` · ${s.part}` : ""}`, i }))];
  const byStep = new Map<string | null, typeof baseFields>();
  for (const f of baseFields) byStep.set(f.stepId, [...(byStep.get(f.stepId) ?? []), f]);
  const ro = !canEdit || frozen;

  return (
    <div className="a-split" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 16, alignItems: "start" }}>
      <div className="a-stack">
        {steps.map((s) => {
          const fs = byStep.get(s.id) ?? [];
          if (!fs.length) return null;
          return (
            <section key={s.id ?? "lesson"} className="a-card" aria-label={s.label}>
              <div className="a-card-h"><h2 className="t-h3">{s.label}</h2><span className="a-grow" />{fs.some((f) => lag.has(f.path)) ? <span className="a-st wait"><Icon n="warning" />Language behind</span> : null}</div>
              <div className="a-card-b a-stack sm">
                {fs.map((f) => {
                  const v = vals[f.path];
                  const changed = v.en !== f.en || v.ar !== f.ar;
                  const b = lagAll.get(f.path);
                  const long = Math.max(v.en.length, v.ar.length) > 70;
                  return (
                    <div key={f.path} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8 }}>
                      <div className="a-field" style={{ gridColumn: "1 / -1", marginBottom: -4 }}>
                        <span className="t-xs ink-2">{f.label}{changed ? <b className="t-xs" style={{ marginInlineStart: 6, color: "var(--info-ink)" }}>Changed</b> : null}</span>
                      </div>
                      <label className="a-field"><span className="sr">{f.label} in English</span>
                        {long ? <textarea className="a-ta" rows={3} lang="en" dir="ltr" value={v.en} readOnly={ro} onChange={(e) => setVals({ ...vals, [f.path]: { ...v, en: e.target.value } })} />
                          : <input className="a-in" lang="en" dir="ltr" value={v.en} readOnly={ro} onChange={(e) => setVals({ ...vals, [f.path]: { ...v, en: e.target.value } })} />}
                      </label>
                      <label className="a-field"><span className="sr">{f.label} in Arabic</span>
                        {long ? <textarea className="a-ta a-ar" rows={3} lang="ar" dir="rtl" value={v.ar} readOnly={ro} onChange={(e) => setVals({ ...vals, [f.path]: { ...v, ar: e.target.value } })} />
                          : <input className="a-in a-ar" lang="ar" dir="rtl" value={v.ar} readOnly={ro} onChange={(e) => setVals({ ...vals, [f.path]: { ...v, ar: e.target.value } })} />}
                      </label>
                      {b ? (
                        <div className="a-note" style={{ gridColumn: "1 / -1" }}>
                          <Icon n="warning" />
                          <div className="t-sm a-row" style={{ gap: 12, flexWrap: "wrap" }}>
                            <span>{b === "ar" ? "Arabic not updated" : "English not updated"}: the other language changed.</span>
                            {!ro ? <label className="a-row t-sm" style={{ gap: 6 }}><input type="checkbox" checked={acks.includes(f.path)} onChange={(e) => setAcks(e.target.checked ? [...acks, f.path] : acks.filter((a) => a !== f.path))} />Checked, no change needed</label> : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <aside className="a-stack" style={{ position: "sticky", top: 72 }}>
        <section className="a-card" aria-label="Checks">
          <div className="a-card-h"><h2 className="t-h3">Checks</h2><span className="a-grow" />{ok ? <span className="a-st good"><Icon n="check-circle-fill" />Ready</span> : <span className="a-st bad"><Icon n="warning" />Not ready</span>}</div>
          <div className="a-card-b">
            <ul className="a-effects">{checks.map((c) => <li key={c.id}><Icon n={c.ok ? "check-circle-fill" : "x-circle"} /><span><b className="t-sm">{c.label}</b>{c.detail ? <span className="t-xs ink-2" style={{ display: "block" }}>{c.detail}</span> : null}</span></li>)}</ul>
          </div>
        </section>
        {!ro ? (
          <section className="a-card" aria-label="Save">
            <div className="a-card-b a-stack sm">
              <form action={saveAction} className="a-stack sm">
                <input type="hidden" name="lesson" value={lessonId} />
                <input type="hidden" name="edits" value={JSON.stringify(edits)} />
                <input type="hidden" name="acks" value={JSON.stringify(acks)} />
                <button type="submit" className="a-btn pri" disabled={saving || !dirty} aria-busy={saving}><Icon n="floppy-disk" />{saving ? "Saving…" : dirty ? "Save draft" : "Draft saved"}</button>
                <Feedback state={saveState} />
              </form>
              <form action={subAction} className="a-stack sm">
                <input type="hidden" name="lessons" value={lessonId} />
                <div className="a-field"><label htmlFor="rel-title">Release title<span className="req" aria-hidden="true">*</span></label><input id="rel-title" name="title" className="a-in" required minLength={3} maxLength={140} defaultValue={`Wording fixes in ${lessonId}`} /></div>
                <div className="a-field"><label htmlFor="rel-note">Note for the publisher</label><textarea id="rel-note" name="note" className="a-ta" rows={2} maxLength={1000} /></div>
                <button type="submit" className="a-btn" disabled={sending || dirty || !ok} aria-busy={sending} title={dirty ? "Save the draft first" : !ok ? "Fix the failed checks first" : undefined}><Icon n="paper-plane-tilt" />{sending ? "Sending…" : "Send for review"}</button>
                <span className="t-xs ink-3">A publisher who did not edit this lesson reviews and publishes it.</span>
                <Feedback state={subState} />
              </form>
            </div>
          </section>
        ) : null}
        <section className="a-card" aria-label="Preview">
          <div className="a-card-h"><h2 className="t-h3">Preview</h2><span className="a-grow" />
            <div className="a-seg" role="group" aria-label="Preview language">
              <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
              <button type="button" aria-pressed={lang === "ar"} onClick={() => setLang("ar")}>العربية</button>
            </div>
          </div>
          <div className="a-card-b">
            <iframe key={`${lang}-${previewKey}`} title={`Preview in ${lang === "en" ? "English" : "Arabic"}`} src={`/${lang}/preview/lesson/${lessonId}?src=draft`}
              style={{ width: "100%", height: 640, border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)" }} />
            <p className="t-xs ink-3" style={{ marginTop: 6 }}>Shows the saved draft in the real player{dirty ? ". Save to see your latest changes." : "."} Answers here are not stored.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
