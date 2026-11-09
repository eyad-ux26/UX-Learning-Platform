"use client";

import { useActionState, useState } from "react";
import { rate, type RateState } from "./actions";

const T = {
  en: { good: "Good", bad: "Not good", comment: "Anything to add? (optional)", send: "Send my answer", sending: "Sending…", thanks: "Thank you. Your answer helps us help you better.", gone: "We already have an answer for this request, or the link is no longer valid.", invalid: "Pick Good or Not good." },
  ar: { good: "جيدة", bad: "غير جيدة", comment: "هل تريد إضافة شيء؟ (اختياري)", send: "أرسل إجابتي", sending: "جارٍ الإرسال…", thanks: "شكرًا لك. إجابتك تساعدنا على خدمتك بشكل أفضل.", gone: "لدينا إجابة على هذا الطلب من قبل، أو أن الرابط لم يعد صالحًا.", invalid: "اختر جيدة أو غير جيدة." },
};

export function RateForm({ token, locale, initial }: { token: string; locale: "en" | "ar"; initial: "good" | "bad" | null }) {
  const t = T[locale];
  const [v, setV] = useState<"good" | "bad" | null>(initial);
  const [state, action, pending] = useActionState<RateState | null, FormData>(rate, null);
  if (state?.ok) return <p role="status" className="card" style={{ padding: "14px 16px" }}>{t.thanks}</p>;
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, inlineSize: "100%", maxInlineSize: 360 }}>
      <input type="hidden" name="token" value={token} />
      {v ? <input type="hidden" name="v" value={v} /> : null}
      <div role="group" aria-label={locale === "ar" ? "تقييمك" : "Your rating"} style={{ display: "flex", gap: 8 }}>
        {(["good", "bad"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={v === k} onClick={() => setV(k)} className={`btn ${v === k ? "btn-primary" : "btn-secondary"} press`} style={{ flex: 1 }}>
            <span className={`ph ${k === "good" ? "ph-thumbs-up" : "ph-thumbs-down"}`} aria-hidden="true" /> {t[k]}
          </button>
        ))}
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
        {t.comment}
        <div className="note-in"><textarea name="comment" rows={3} maxLength={1000} dir="auto" /></div>
      </label>
      <button type="submit" className="btn btn-primary btn-block press" disabled={!v || pending} aria-busy={pending}>{pending ? t.sending : t.send}</button>
      {state && !state.ok ? <p role="alert" style={{ color: "var(--bad, #b42318)", fontSize: 14 }}>{t[state.error ?? "invalid"]}</p> : null}
    </form>
  );
}
