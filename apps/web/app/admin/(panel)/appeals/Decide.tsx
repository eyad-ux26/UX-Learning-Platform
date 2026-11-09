"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Feedback, type Result } from "@/components/admin/forms";
import { decide } from "./actions";

// Starting text for each verdict. The member edits it; both languages are sent, the learner reads their own.
const START = {
  accept: {
    en: "You’re right: your answer works here too. We now count it as correct and will update this step so it is clearer.",
    ar: "معك حق: إجابتك صحيحة هنا أيضًا. أصبحنا نحسبها إجابة صحيحة، وسنحدّث هذه الخطوة لتصبح أوضح.",
  },
  keep: {
    en: "Thank you for asking. We looked again and kept the result: ",
    ar: "شكرًا على سؤالك. راجعنا الخطوة مرة أخرى وأبقينا النتيجة كما هي: ",
  },
};

export function Decide({ id, quality }: { id: string; quality: boolean }) {
  const [verdict, setVerdict] = useState<"accept" | "keep">("accept");
  const [en, setEn] = useState(START.accept.en);
  const [ar, setAr] = useState(START.accept.ar);
  const [state, formAction, pending] = useActionState<Result | null, FormData>(decide, null);
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  const pick = (v: "accept" | "keep") => {
    // Only swap the text while it is still the untouched starting text.
    if (en === START[verdict].en) setEn(START[v].en);
    if (ar === START[verdict].ar) setAr(START[v].ar);
    setVerdict(v);
  };
  return (
    <form action={formAction} className="a-stack" aria-label="Answer the request">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="verdict" value={verdict} />
      <span className="a-seg" role="group" aria-label="Decision">
        <button type="button" aria-pressed={verdict === "accept"} onClick={() => pick("accept")}>Accept: the answer counts</button>
        <button type="button" aria-pressed={verdict === "keep"} onClick={() => pick("keep")}>Keep the result</button>
      </span>
      <div className="a-field">
        <label htmlFor={`en-${id}`}>Reply in English<span className="req" aria-hidden="true">*</span></label>
        <textarea id={`en-${id}`} name="reply_en" className="a-ta" rows={3} required maxLength={2000} value={en} onChange={(e) => setEn(e.target.value)} />
      </div>
      <div className="a-field">
        <label htmlFor={`ar-${id}`}>Reply in Arabic<span className="req" aria-hidden="true">*</span></label>
        <textarea id={`ar-${id}`} name="reply_ar" className="a-ta" rows={3} required maxLength={2000} dir="rtl" lang="ar" value={ar} onChange={(e) => setAr(e.target.value)} />
      </div>
      {verdict === "accept" ? (
        <div className="a-field">
          <label htmlFor={`xp-${id}`}>XP to add</label>
          <select id={`xp-${id}`} name="xp" className="a-in" defaultValue="10" style={{ width: "auto" }}>
            <option value="0">None</option><option value="5">5 XP</option><option value="10">10 XP (a first-try answer)</option>
          </select>
          <span className="t-xs ink-3">Accepting also marks their last try at this step as right, so the step stops coming back in the unit check.</span>
        </div>
      ) : null}
      <label className="a-row t-sm" style={{ gap: 8 }}>
        <input type="checkbox" name="quality" defaultChecked={quality || verdict === "accept"} />
        Send this step to content quality (the content team fixes it)
      </label>
      <div className="a-row">
        <button type="submit" className="a-btn pri" disabled={pending} aria-busy={pending}>{pending ? "Sending…" : verdict === "accept" ? "Accept and reply" : "Keep the result and reply"}</button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
