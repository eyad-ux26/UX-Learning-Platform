"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatTime, hourWindow, MINUTES, parseTime, PRESETS, toTime, type Period } from "@/lib/reminder";
import { play } from "@/lib/sound";

/**
 * Daily reminder: a switch (on by default) and a time button. On phones the button is the phone's own time picker;
 * on a laptop it opens a small popover with quick picks and hour, minute and AM/PM columns.
 */
export function ReminderField({ value, onChange, settings }: {
  value: string | null; onChange: (v: string | null) => void;
  /** Settings row (design audit P2): the label on top with the switch at the trailing edge, the time button under it. */
  settings?: { label: string; sub: string; switchLabel: string; on: string; off: string };
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale() as "en" | "ar";
  const id = useId();
  const on = value !== null;
  const shown = value ?? "20:00";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(shown);
  const [desk, setDesk] = useState(false);
  const [below, setBelow] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesk(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const close = (focusButton = true) => { setOpen(false); if (focusButton) btn.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) close(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  useEffect(() => { if (!on) setOpen(false); }, [on]);
  // Opening moves focus into the popover (the chosen preset or hour); Esc closes it from anywhere on the page.
  const dlg = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    dlg.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleOpen = () => {
    if (!on) return;
    if (!open) {
      setDraft(shown);
      setBelow((btn.current?.getBoundingClientRect().top ?? 999) < 360); // no room above: open downwards
    }
    setOpen(!open);
  };

  const cur = parseTime(draft);
  const set = (hour: number, minute: number, period: Period) => setDraft(toTime(hour, minute, period));
  const move = (e: React.KeyboardEvent, step: (d: number) => void) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); step(e.key === "ArrowDown" ? 1 : -1); }
  };

  const label = `${t("reminder")}`;
  const timeText = formatTime(shown, locale);
  const helpId = `${id}-help`;

  const toggle = () => { play(on ? "ui-toggle-off" : "ui-toggle-on"); onChange(on ? null : shown); };
  return (
    <div className={settings ? "set-row is-rem" : "field"}>
      {settings ? (
        <div className="rem-head" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="set-l" id={`${id}-label`}>{settings.label}<small>{settings.sub}</small></span>
          <button type="button" role="switch" aria-checked={on} aria-label={settings.switchLabel} aria-describedby={helpId}
            className={`switch sw-only${on ? " is-on" : ""}`} onClick={toggle}>
            <span className="track" aria-hidden="true" />
          </button>
        </div>
      ) : <span className="ob-label" id={`${id}-label`}>{label}</span>}
      <div className="rem rem-wrap" ref={wrap} style={settings ? { flexWrap: "nowrap" } : undefined}>
        {settings ? null : (
          <button type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-sw`} aria-describedby={helpId}
            className={`switch${on ? " is-on" : ""}`}
            onClick={() => { play("select-snap"); onChange(on ? null : shown); }}>
            <span className="track" aria-hidden="true" />
            <span id={`${id}-sw`}>{t("remindAt")}</span>
          </button>
        )}

        {desk ? (
          <button ref={btn} type="button" className={`time-btn${open ? " is-open" : ""}${on ? "" : " is-disabled"}`}
            aria-haspopup="dialog" aria-expanded={open} aria-disabled={!on} aria-describedby={helpId}
            onClick={toggleOpen}>
            <span className="ph ph-bell" aria-hidden="true" />
            <span className="time-val" dir="ltr">{timeText}</span>
            <span className="ph ph-caret caret" aria-hidden="true" />
          </button>
        ) : (
          <label className={`time-btn${on ? "" : " is-disabled"}`} aria-disabled={!on}>
            <span className="ph ph-bell" aria-hidden="true" />
            <span className="time-val" dir="ltr">{timeText}</span>
            <span className="ph ph-caret caret" aria-hidden="true" />
            <input type="time" className="time-native" value={shown} disabled={!on} aria-label={t("tpTitle")} aria-describedby={helpId}
              onChange={(e) => e.target.value && onChange(e.target.value)} />
          </label>
        )}

        {desk && open ? (
          <div className="tp" ref={dlg} role="dialog" aria-labelledby={`${id}-tp`} style={below ? { bottom: "auto", top: "calc(100% + 10px)" } : undefined}>
            <div className="tp-head">
              <h3 className="tp-title" id={`${id}-tp`}>{t("tpTitle")}</h3>
              <span className="tp-now" dir="ltr" aria-live="polite">{formatTime(draft, locale)}</span>
            </div>
            <div className="tp-presets">
              {PRESETS.map((p) => (
                <button key={p.id} type="button" className={`tp-preset press${draft === p.time ? " is-on" : ""}`} aria-pressed={draft === p.time} onClick={() => setDraft(p.time)}>
                  <b dir="ltr">{formatTime(p.time, locale)}</b><small>{t(p.id)}</small>
                </button>
              ))}
            </div>
            <div className="tp-cols">
              <div className="tp-col" role="listbox" aria-label={t("tpHour")} onKeyDown={(e) => move(e, (d) => set(((cur.hour - 1 + d + 12) % 12) + 1, cur.minute, cur.period))}>
                <span className="tp-col-name" aria-hidden="true">{t("tpHour")}</span>
                {hourWindow(cur.hour).map((h, i) => (
                  <button key={`${h}-${i}`} type="button" role="option" aria-selected={h === cur.hour} tabIndex={h === cur.hour ? 0 : -1}
                    className={`tp-cell${h === cur.hour ? " is-on" : ""}${i === 0 || i === 4 ? " is-far" : ""}`} onClick={() => set(h, cur.minute, cur.period)}>{h}</button>
                ))}
              </div>
              <div className="tp-col" role="listbox" aria-label={t("tpMinute")} onKeyDown={(e) => move(e, (d) => set(cur.hour, MINUTES[(Math.max(0, MINUTES.indexOf(cur.minute as never)) + d + 4) % 4], cur.period))}>
                <span className="tp-col-name" aria-hidden="true">{t("tpMinute")}</span>
                {MINUTES.map((m) => (
                  <button key={m} type="button" role="option" aria-selected={m === cur.minute} tabIndex={m === cur.minute || (!MINUTES.includes(cur.minute as never) && m === 0) ? 0 : -1}
                    className={`tp-cell${m === cur.minute ? " is-on" : ""}`} onClick={() => set(cur.hour, m, cur.period)}>{String(m).padStart(2, "0")}</button>
                ))}
              </div>
              <div className="tp-col" role="listbox" aria-label={t("tpPeriod")} onKeyDown={(e) => move(e, () => set(cur.hour, cur.minute, cur.period === "am" ? "pm" : "am"))}>
                <span className="tp-col-name" aria-hidden="true">{t("tpPeriod")}</span>
                {(["am", "pm"] as const).map((p) => (
                  <button key={p} type="button" role="option" aria-selected={p === cur.period} tabIndex={p === cur.period ? 0 : -1}
                    className={`tp-cell${p === cur.period ? " is-on" : ""}`} onClick={() => set(cur.hour, cur.minute, p)}>{t(p)}</button>
                ))}
              </div>
            </div>
            <div className="tp-foot">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => close()}>{t("tpCancel")}</button>
              <button type="button" className="btn btn-primary btn-sm press" onClick={() => { onChange(draft); play("select-snap"); close(); }}>{t("tpSet")}</button>
            </div>
          </div>
        ) : null}
      </div>
      <span id={helpId} className={settings ? "t-small ink-2" : "help"}>{settings ? (on ? settings.on : settings.off) : on ? t("reminderOn") : t("reminderOff")}</span>
    </div>
  );
}
