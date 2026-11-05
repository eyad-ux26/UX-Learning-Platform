import { useTranslations } from "next-intl";

/** "Free, always" next to "With Pro": the same two lists on the paywall and the free learner's plan card. */
export function FreeProList({ single }: { single?: boolean }) {
  const t = useTranslations("billing");
  return (
    <div className="fl" style={single ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>
      <div>
        <span className="fl-h">{t("freeAlways")}</span>
        {(["a", "b", "c"] as const).map((k) => <p key={k}><span className="ph ph-check-circle-fill" aria-hidden="true" />{t(`freeList.${k}`)}</p>)}
      </div>
      <div className="is-pro">
        <span className="fl-h"><span className="pro-tag">PRO</span>{t("withPro")}</span>
        {(["a", "b", "c"] as const).map((k) => <p key={k}><span className="ph ph-lock-open" style={{ color: "var(--link)" }} aria-hidden="true" />{t(`proList.${k}`)}</p>)}
      </div>
    </div>
  );
}
