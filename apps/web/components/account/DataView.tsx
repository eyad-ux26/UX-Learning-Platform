"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteAfter, longDate } from "@/lib/reminder-plan";
import { play } from "@/lib/sound";
import { deleteAccount } from "@/app/[locale]/app/(shell)/settings/actions";
import { Sheet } from "./Sheet";

/** Download my data (one JSON file) and Delete my account, with the 30-day undo spelled out before the red button. */
export function DataView() {
  const t = useTranslations("acctdata");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (location.hash === "#delete") setAsking(true);
  }, []);
  const date = longDate(deleteAfter(new Date()), locale);

  const go = () => {
    if (!confirm) return;
    setFailed(false);
    start(async () => {
      const r = await deleteAccount({ confirm: true, locale }).catch(() => ({ ok: false }));
      if (!r.ok) {
        setFailed(true);
        return;
      }
      router.replace("/goodbye");
      router.refresh();
    });
  };
  const holds = ["h1", "h2", "h3", "h4", "h5", "h6"];

  return (
    <>
      <div className="s4-cols">
        <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="chg-ic">
              <span className="ph ph-brackets-curly" aria-hidden="true" />
            </span>
            <h2 className="t-h3" style={{ flex: 1, margin: 0 }}>
              {t("download")}
            </h2>
          </div>
          <p className="t-small ink-2" style={{ fontSize: 14, margin: 0 }}>
            {t("dlBody")}
          </p>
          <ul className="holds" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {holds.map((h) => (
              <li key={h} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span className="ph ph-check-circle-fill" aria-hidden="true" />
                {t(h)}
              </li>
            ))}
          </ul>
          <a
            href="/api/account/export"
            download
            className="btn btn-primary btn-block press"
            onClick={() => play("ui-tap")}
          >
            <span className="ph ph-download" aria-hidden="true" />
            {t("dlBtn")}
          </a>
          <p className="pg-note" style={{ fontSize: 13 }}>
            <span className="ph ph-info" aria-hidden="true" />
            <span>{t("dlNote")}</span>
          </p>
        </section>
        <section
          className="card danger-card"
          id="delete"
          style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="chg-ic" style={{ background: "var(--wrong-bg)", color: "var(--wrong-ink)" }}>
              <span className="ph ph-trash" aria-hidden="true" />
            </span>
            <h2 className="t-h3" style={{ flex: 1, margin: 0 }}>
              {t("delete")}
            </h2>
          </div>
          <p className="t-small ink-2" style={{ fontSize: 14, margin: 0 }}>
            {t("delBody")}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-block press"
            style={{ color: "var(--wrong-ink)" }}
            onClick={() => {
              setConfirm(false);
              setAsking(true);
            }}
          >
            {t("delBtn")}
          </button>
        </section>
      </div>

      {asking ? (
        <Sheet titleId="del-t" onClose={() => setAsking(false)}>
          <h2 id="del-t">{t("delTitle")}</h2>
          <ul className="why-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {[
              ["ph-signout", "r1"],
              ["ph-calendar", "r2"],
              ["ph-link", "r3"],
              ["ph-sync", "r4"],
            ].map(([icon, k]) => (
              <li key={k} className="why-row" style={{ minBlockSize: 52 }}>
                <span className={`ph ${icon}`} style={{ color: "var(--ink-2)" }} aria-hidden="true" />
                <span className="grow">
                  <b>{t(`${k}t`)}</b>
                  <span>{t(`${k}b`, { date })}</span>
                </span>
              </li>
            ))}
          </ul>
          <a href="/api/account/export" download className="pg-link" style={{ minBlockSize: 44 }}>
            <span className="ph ph-download" aria-hidden="true" />
            {t("delFirst")}
          </a>
          <button
            type="button"
            role="checkbox"
            aria-checked={confirm}
            className={`confirm${confirm ? " is-on" : ""}`}
            onClick={() => setConfirm((v) => !v)}
            style={{ font: "inherit", color: "inherit", textAlign: "start", cursor: "pointer" }}
          >
            <span className={`check${confirm ? " is-on" : ""}`} style={{ minBlockSize: 0 }}>
              <span className="box" aria-hidden="true">
                <span className="ph ph-check" />
              </span>
            </span>
            <span>{t("delConfirm")}</span>
          </button>
          {failed ? (
            <p className="form-alert" role="alert" style={{ margin: 0 }}>
              <span className="ph ph-warning" aria-hidden="true" />
              <span>{t("delFailed")}</span>
            </p>
          ) : null}
          <button
            type="button"
            className={`btn btn-wrong btn-lg btn-block press${confirm ? "" : " is-disabled"}`}
            aria-disabled={!confirm}
            onClick={go}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {t("delGo")}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ minBlockSize: 44 }}
            onClick={() => setAsking(false)}
            data-autofocus
          >
            {t("keep")}
          </button>
        </Sheet>
      ) : null}
    </>
  );
}
