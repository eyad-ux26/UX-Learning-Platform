"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CHANNELS, KINDS, countChanges, isLocked, type Channel, type Kind, type Prefs } from "@/lib/notifications";
import { formatTime } from "@/lib/reminder";
import { play } from "@/lib/sound";
import { pushState, turnOnPush, type PushState } from "@/lib/push-client";
import { saveNotificationPrefs } from "@/app/[locale]/app/(shell)/settings/actions";

const ICON: Record<Channel, string> = { in_app: "ph-app-window", email: "ph-mail", push: "ph-device-mobile" };
const clone = (p: Prefs): Prefs => JSON.parse(JSON.stringify(p));

/** Kind × channel. Changes are kept only on Save changes; Cancel puts every switch back (design review, Eyad, 2 Nov). */
export function NotifsView({ initial, reminder }: { initial: Prefs; reminder: string | null }) {
  const t = useTranslations("notifs");
  const locale = useLocale() as "en" | "ar";
  const [base, setBase] = useState<Prefs>(clone(initial));
  const [cells, setCells] = useState<Prefs>(clone(initial));
  const [saved, setSaved] = useState<"idle" | "saved" | "failed">("idle");
  const [push, setPush] = useState<PushState>("unsupported");
  const [pending, start] = useTransition();
  useEffect(() => { pushState().then(setPush); }, []);

  const changes = countChanges(base, cells);
  const pushOff = push !== "on";
  const toggle = (k: Kind, c: Channel) => {
    if (isLocked(k, c) || (c === "push" && pushOff)) return;
    const next = clone(cells);
    next[k][c] = !next[k][c];
    play(next[k][c] ? "ui-toggle-on" : "ui-toggle-off");
    setCells(next);
    setSaved("idle");
  };
  const save = () => start(async () => {
    const r = await saveNotificationPrefs(cells).catch(() => ({ ok: false as const, prefs: undefined }));
    if (r.ok && r.prefs) { setBase(clone(r.prefs)); setCells(clone(r.prefs)); setSaved("saved"); }
    else setSaved("failed");
  });
  const cancel = () => { setCells(clone(base)); setSaved("idle"); };
  const enablePush = () => start(async () => { setPush(await turnOnPush().catch(() => "off" as PushState)); });

  const sub = (k: Kind) => (k === "reminder" ? (reminder ? t("k_reminder_sub", { time: formatTime(reminder, locale) }) : t("k_reminder_off")) : t(`k_${k}_sub`));
  const note = push === "on" ? { icon: "ph-check-circle-fill", title: t("pushHereT"), body: t("pushHereB"), act: false }
    : push === "blocked" ? { icon: "ph-bell-slash", title: t("pushBlockT"), body: t("pushBlockB"), act: false }
    : push === "unsupported" ? { icon: "ph-bell-slash", title: t("pushNoneT"), body: t("pushNoneB"), act: false }
    : { icon: "ph-bell-slash", title: t("pushNotT"), body: t("pushNotB"), act: true };
  const msg = changes ? t("unsaved", { count: changes }) : saved === "saved" ? t("savedMsg") : saved === "failed" ? t("failed") : t("noUnsaved");

  return (
    <>
      <div className="s4-split">
        <div className="pg-stack" style={{ gap: 12 }}>
          <p className="t-body ink-2" style={{ fontSize: 15, margin: 0 }}>{t("lead")}</p>
          <div className="nmx" role="table" aria-label={t("title")}>
            <div role="row" style={{ display: "contents" }}>
              <span className="nmx-h" role="columnheader" style={{ justifyContent: "flex-start", paddingInlineStart: 14, alignItems: "flex-start" }}>{t("kind")}</span>
              {CHANNELS.map((c) => <span key={c} className="nmx-h" role="columnheader"><span className={`ph ${ICON[c]}`} aria-hidden="true" />{t(`ch_${c}`)}</span>)}
            </div>
            {KINDS.map((k, i) => {
              const last = i === KINDS.length - 1 ? " nmx-last" : "";
              return (
                <div role="row" key={k} style={{ display: "contents" }}>
                  <span className={`nmx-k${last}`} role="rowheader">{t(`k_${k}`)}<small>{sub(k)}</small></span>
                  {CHANNELS.map((c) => {
                    const lock = isLocked(k, c);
                    const dis = c === "push" && pushOff;
                    const on = lock || (!dis && cells[k][c]);
                    return (
                      <span key={c} className={last.trim()} role="cell">
                        {lock ? (
                          <span className="lock-on" title={t("always")} role="img" aria-label={`${t(`k_${k}`)}, ${t(`ch_${c}`)}: ${t("always")}`}><span className="ph ph-lock-fill" aria-hidden="true" /></span>
                        ) : (
                          <button type="button" role="checkbox" aria-checked={on} aria-disabled={dis || undefined} aria-label={`${t(`k_${k}`)}, ${t(`ch_${c}`)}`}
                            className={`check${on ? " is-on" : ""}${dis ? " is-disabled" : ""}`} onClick={() => toggle(k, c)} style={{ background: "none", border: 0, padding: 0 }}>
                            <span className="box" aria-hidden="true"><span className="ph ph-check" /></span>
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="note-row">
            <span className={`ph ${note.icon}`} aria-hidden="true" />
            <span className="grow"><b>{note.title}</b><span>{note.body}</span></span>
            {note.act ? <button type="button" className="btn btn-secondary btn-sm press" style={{ flex: "none" }} onClick={enablePush} disabled={pending}>{t("turnOn")}</button> : null}
          </div>
        </div>
        <aside className="pg-stack">
          <section className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="t-over" style={{ margin: 0 }}>{t("rulesTitle")}</h2>
            {[["ph-bell", "rule1"], ["ph-flame", "rule2"], ["ph-lock", "rule3"], ["ph-mail", "rule4"]].map(([icon, key]) => (
              <p key={key} className="pg-note" style={{ fontSize: 14 }}><span className={`ph ${icon}`} aria-hidden="true" /><span>{t(key)}</span></p>
            ))}
          </section>
        </aside>
      </div>
      <footer className="save-bar is-sticky">
        <span className="grow" role="status" aria-live="polite"><span className={`ph ${changes ? "ph-pencil" : saved === "saved" ? "ph-check-circle-fill" : "ph-check"}`} aria-hidden="true" />{msg}</span>
        <div className="acts">
          <button type="button" className="btn btn-secondary press" onClick={cancel} disabled={!changes || pending}>{t("cancel")}</button>
          <button type="button" className="btn btn-primary press" onClick={save} disabled={!changes || pending} aria-busy={pending || undefined}>{t("saveChanges")}</button>
        </div>
      </footer>
    </>
  );
}
