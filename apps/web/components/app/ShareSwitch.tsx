"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setAchievementPage } from "@/app/[locale]/app/(shell)/profile/share-actions";

/** The achievement page switch: off by default, and turning it off removes the page at once. */
export function ShareSwitch({
  initialOn,
  initialHandle,
  origin,
}: {
  initialOn: boolean;
  initialHandle: string | null;
  origin: string;
}) {
  const t = useTranslations("cert");
  const [on, setOn] = useState(initialOn);
  const [handle, setHandle] = useState(initialHandle);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const url = handle ? `${origin}/u/${handle}` : "";
  const toggle = () =>
    start(async () => {
      setFailed(false);
      const res = await setAchievementPage({ enabled: !on });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      setOn(!on);
      if (res.handle) setHandle(res.handle);
    });
  return (
    <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        className="between"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
      >
        <div>
          <p className="t-label">{t("shareTitle")}</p>
          <p className="t-small ink-2">{on ? t("shareOn") : t("shareOff")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t("shareTitle")}
          className={`switch sw-only${on ? " is-on" : ""}`}
          onClick={toggle}
          disabled={pending}
        >
          <span className="track" />
        </button>
      </div>
      <p className="t-small ink-2">{t("shareBody")}</p>
      {on && url ? (
        <div className="url-row">
          <input
            readOnly
            className="url-field"
            aria-label={t("link")}
            value={url}
            dir="ltr"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <span className="ph ph-copy" aria-hidden="true" />
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      ) : null}
      <p className="t-small ink-2">{t("sees")}</p>
      <p className="t-small ink-2">{t("never")}</p>
      <p className="t-small ink-2">{t("offNote")}</p>
      {failed ? (
        <p className="ob-err" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </section>
  );
}
