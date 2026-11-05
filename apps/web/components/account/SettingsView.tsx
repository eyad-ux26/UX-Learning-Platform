"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ReminderField } from "@/components/app/ReminderField";
import { applyTheme, type ThemePref } from "@/lib/theme";
import { initSound, play, readMuted, setMuted } from "@/lib/sound";
import { flush, setSyncUser } from "@/lib/sync";
import { saveSetting } from "@/app/[locale]/app/(shell)/settings/actions";
import { signOut } from "@/app/[locale]/app/(shell)/profile/actions";
import { pushState, type PushState } from "@/lib/push-client";
import { Sheet } from "./Sheet";

/** Slice 5 turns this on when Plan and billing (/app/settings/billing) exists. */
const BILLING_READY = false;

type Initial = { name: string; email: string; provider: string; theme: ThemePref; goal: 1 | 2 | 3; reminder: string | null };

function Caret() {
  return <span className="ph ph-caret-right flip" aria-hidden="true" />;
}

export function SettingsView({ initial, userId, restored }: { initial: Initial; userId: string; restored?: boolean }) {
  const t = useTranslations("settings");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState(initial.name);
  const [theme, setThemeState] = useState<ThemePref>(initial.theme);
  const [goal, setGoal] = useState(initial.goal);
  const [reminder, setReminder] = useState(initial.reminder);
  const [sound, setSound] = useState(true);
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial.name);
  const [push, setPush] = useState<PushState>("unsupported");
  const [toast, setToast] = useState(restored ? t("restored") : "");
  const [pending, start] = useTransition();

  useEffect(() => { initSound(); setSound(!readMuted()); pushState().then(setPush); }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 6000); return () => clearTimeout(id); }, [toast]);

  const save = (input: Parameters<typeof saveSetting>[0]) => start(async () => {
    const r = await saveSetting(input).catch(() => ({ ok: false }));
    setStatus(r.ok ? "saved" : "failed");
  });

  const pickLocale = (l: "en" | "ar") => {
    if (l === locale) return;
    play("ui-tap");
    start(async () => {
      await saveSetting({ field: "locale", value: l }).catch(() => null);
      router.replace(pathname, { locale: l });
    });
  };
  const pickTheme = (v: ThemePref) => { setThemeState(v); applyTheme(v); play("ui-tap"); save({ field: "theme", value: v }); };
  const pickGoal = (n: 1 | 2 | 3) => { setGoal(n); play("select-snap"); save({ field: "daily_goal", value: n }); };
  const changeReminder = (v: string | null) => { setReminder(v); save({ field: "reminder_time", value: v }); };
  const toggleSound = () => { const on = !sound; setSound(on); setMuted(!on); if (on) play("ui-toggle-on"); };
  const saveName = () => {
    const v = draft.trim();
    if (!v) return;
    start(async () => {
      const r = await saveSetting({ field: "display_name", value: v }).catch(() => ({ ok: false }));
      setStatus(r.ok ? "saved" : "failed");
      if (r.ok) { setName(v); setEditing(false); router.refresh(); }
    });
  };
  const doSignOut = () => start(async () => {
    setSyncUser(userId);
    await Promise.race([flush().catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
    await signOut();
    router.push("/");
    router.refresh();
  });

  const via = initial.provider === "google" ? t("viaGoogle") : initial.provider === "apple" ? t("viaApple") : t("viaEmail");
  const themes: [ThemePref, string][] = [["system", t("themeSystem")], ["light", t("themeLight")], ["dark", t("themeDark")]];

  return (
    <>
      <div className="s4-cols">
        <div className="pg-stack" style={{ gap: 10 }}>
          <h2 className="t-over set-sec">{t("secAccount")}</h2>
          <div className="set">
            <button type="button" className="set-row" onClick={() => { setDraft(name); setEditing(true); play("sheet-up"); }} style={{ font: "inherit", background: "none", border: 0, borderBlockEnd: "2px solid var(--line)", textAlign: "start", cursor: "pointer", inlineSize: "100%" }}>
              <span className="ph ph-user" aria-hidden="true" /><span className="set-l">{t("name")}<small>{name}</small></span><span className="set-v">{t("edit")}<Caret /></span>
            </button>
            <div className="set-row"><span className="ph ph-mail" aria-hidden="true" /><span className="set-l">{t("email")}<small className="ltr" style={{ textAlign: "start" }}>{initial.email}</small></span><span className="set-v" style={{ fontWeight: 600 }}>{via}</span></div>
            {BILLING_READY ? (
              <Link href="/app/settings/billing" className="set-row"><span className="ph ph-credit-card" aria-hidden="true" /><span className="set-l">{t("billing")}<small>{t("billingSub")}</small></span><span className="set-v"><span className="pro-tag">PRO</span><Caret /></span></Link>
            ) : null}
          </div>

          <h2 className="t-over set-sec">{t("secLearning")}</h2>
          <div className="set">
            <div className="set-row is-seg"><span className="ph ph-globe" aria-hidden="true" /><span className="set-l" id="st-lang">{t("language")}</span>
              <div className="tabs" role="radiogroup" aria-labelledby="st-lang">
                {(["en", "ar"] as const).map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={l === locale} lang={l} className={`tab${l === locale ? " is-on" : ""}`} onClick={() => pickLocale(l)} disabled={pending && l !== locale}>{l === "en" ? "English" : "العربية"}</button>
                ))}
              </div>
            </div>
            <div className="set-row is-seg"><span className="ph ph-moon" aria-hidden="true" /><span className="set-l" id="st-theme">{t("theme")}</span>
              <div className="tabs" role="radiogroup" aria-labelledby="st-theme">
                {themes.map(([v, label]) => (
                  <button key={v} type="button" role="radio" aria-checked={theme === v} className={`tab${theme === v ? " is-on" : ""}`} onClick={() => pickTheme(v)} style={{ padding: "0 4px" }}>{label}</button>
                ))}
              </div>
            </div>
            <div className="set-row is-seg"><span className="ph ph-target" aria-hidden="true" /><span className="set-l" id="st-goal">{t("goal")}<small>{t("goalSub")}</small></span>
              <div className="tabs" role="radiogroup" aria-labelledby="st-goal">
                {([1, 2, 3] as const).map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={goal === n} aria-label={t("goalAria", { count: n })} className={`tab${goal === n ? " is-on" : ""}`} onClick={() => pickGoal(n)}>{n}</button>
                ))}
              </div>
            </div>
            <ReminderField value={reminder} onChange={changeReminder} settings={{ label: t("reminder"), sub: t("remSub"), switchLabel: t("remindMe"), on: t("remOn"), off: t("remOff") }} />
            <div className="set-row"><span className="ph ph-speaker-high" aria-hidden="true" /><span className="set-l" id="st-sound">{t("sound")}<small>{t("soundSub")}</small></span>
              <button type="button" role="switch" aria-checked={sound} aria-labelledby="st-sound" className={`switch sw-only${sound ? " is-on" : ""}`} onClick={toggleSound}><span className="track" aria-hidden="true" /></button>
            </div>
          </div>
          <p className="t-small" role="status" aria-live="polite" style={{ minBlockSize: 20, margin: 0, color: status === "failed" ? "var(--wrong-ink)" : "var(--right-ink)", fontWeight: 700 }}>
            {status === "saved" ? <><span className="ph ph-check-circle-fill" aria-hidden="true" /> {t("saved")}</> : status === "failed" ? t("failed") : ""}
          </p>
        </div>

        <div className="pg-stack" style={{ gap: 10 }}>
          <h2 className="t-over set-sec">{t("secNotif")}</h2>
          <div className="set">
            <Link href="/app/settings/notifications" className="set-row"><span className="ph ph-bell" aria-hidden="true" /><span className="set-l">{t("notifChoices")}<small>{push === "on" ? t("pushOn") : t("pushOff")}</small></span><span className="set-v"><Caret /></span></Link>
          </div>
          <h2 className="t-over set-sec">{t("secSharing")}</h2>
          <div className="set">
            <Link href="/app/profile" className="set-row"><span className="ph ph-globe" aria-hidden="true" /><span className="set-l">{t("pubTitle")}<small>{t("sharingWhere")}</small></span><span className="set-v"><Caret /></span></Link>
            <Link href="/app/profile" className="set-row"><span className="ph ph-ranking" aria-hidden="true" /><span className="set-l">{t("boardTitle")}<small>{t("sharingWhere")}</small></span><span className="set-v"><Caret /></span></Link>
          </div>
          <h2 className="t-over set-sec">{t("secData")}</h2>
          <div className="set">
            <Link href="/app/settings/data" className="set-row"><span className="ph ph-download" aria-hidden="true" /><span className="set-l">{t("download")}<small>{t("downloadSub")}</small></span><span className="set-v"><Caret /></span></Link>
            <Link href="/app/settings/data#delete" className="set-row is-danger"><span className="ph ph-trash" aria-hidden="true" /><span className="set-l">{t("delete")}</span><span className="set-v"><Caret /></span></Link>
          </div>
          <h2 className="t-over set-sec">{t("secHelp")}</h2>
          <div className="set">
            <Link href="/app/help" className="set-row"><span className="ph ph-lifebuoy" aria-hidden="true" /><span className="set-l">{t("helpLong")}<small className="ltr" style={{ textAlign: "start" }}>support@uxgate.org</small></span><span className="set-v"><Caret /></span></Link>
            <Link href="/privacy" className="set-row"><span className="ph ph-shield-check" aria-hidden="true" /><span className="set-l">{t("privacy")}</span><span className="set-v"><Caret /></span></Link>
            <Link href="/terms" className="set-row"><span className="ph ph-article" aria-hidden="true" /><span className="set-l">{t("terms")}</span><span className="set-v"><Caret /></span></Link>
          </div>
          <button type="button" className="btn btn-secondary btn-block press" style={{ marginBlockStart: 6 }} onClick={doSignOut} disabled={pending}><span className="ph ph-signout" aria-hidden="true" />{t("signOut")}</button>
          <p className="t-small ink-3" style={{ textAlign: "center", fontSize: 12 }}>{t("version")}</p>
        </div>
      </div>

      {editing ? (
        <Sheet titleId="st-name-t" onClose={() => setEditing(false)}>
          <h2 id="st-name-t">{t("nameTitle")}</h2>
          <div className="field">
            <label htmlFor="st-name">{t("name")}</label>
            <div className="input"><span className="ph ph-user" aria-hidden="true" /><input id="st-name" value={draft} maxLength={60} autoComplete="name" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveName(); }} /></div>
            <span className="help">{t("nameHelp")}</span>
          </div>
          <button type="button" className="btn btn-primary btn-lg btn-block press" onClick={saveName} disabled={pending || !draft.trim()}>{t("save")}</button>
          <button type="button" className="btn btn-ghost btn-block" style={{ minBlockSize: 44 }} onClick={() => setEditing(false)}>{t("cancel")}</button>
        </Sheet>
      ) : null}
      {toast ? <div className="toast pop s4-toast" role="status"><span className="ph ph-check-circle-fill" aria-hidden="true" /><span style={{ flex: 1 }}>{toast}</span></div> : null}
    </>
  );
}
