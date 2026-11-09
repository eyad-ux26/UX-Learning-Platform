"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Feedback, type Result } from "@/components/admin/forms";
import { decide } from "./actions";

// Starting text for each verdict, in the learner's app language. The member edits it before sending.
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

export function Decide({ id, quality, lang, name }: { id: string; quality: boolean; lang: "en" | "ar"; name: string }) {
  const [verdict, setVerdict] = useState<"accept" | "keep">("accept");
  const [text, setText] = useState(START.accept[lang]);
  const [state, formAction, pending] = useActionState<Result | null, FormData>(decide, null);
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  const pick = (v: "accept" | "keep") => {
    // Only swap the text while it is still the untouched starting text.
    if (text === START[verdict][lang]) setText(START[v][lang]);
    setVerdict(v);
  };
  return (
    <form action={formAction} className="a-stack" aria-label="Answer the request">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="verdict" value={verdict} />
      <input type="hidden" name="lang" value={lang} />
      <span className="a-seg" role="group" aria-label="Decision">
        <button type="button" aria-pressed={verdict === "accept"} onClick={() => pick("accept")}>Accept: the answer counts</button>
        <button type="button" aria-pressed={verdict === "keep"} onClick={() => pick("keep")}>Reject: keep the result</button>
      </span>
      <div className="a-field">
        <label htmlFor={`rp-${id}`}>Reply to {name} (sent in {lang === "ar" ? "Arabic" : "English"}, their app language)<span className="req" aria-hidden="true">*</span></label>
        <textarea id={`rp-${id}`} name="reply" className="a-ta" rows={5} required maxLength={2000} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} value={text} onChange={(e) => setText(e.target.value)} />
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
        <button type="submit" className="a-btn pri" disabled={pending} aria-busy={pending}>{pending ? "Sending…" : verdict === "accept" ? "Accept and credit the skill" : "Reject and reply"}</button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
