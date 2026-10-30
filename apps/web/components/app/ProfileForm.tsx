"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { play } from "@/lib/sound";
import { saveProfile, signOut } from "@/app/[locale]/app/(shell)/profile/actions";

export function ProfileForm({ initial, email }: { initial: { displayName: string; dailyGoal: 1 | 2 | 3; reminder: string }; email: string }) {
  const t = useTranslations("profile");
  const o = useTranslations("onboarding");
  const router = useRouter();
  const [name, setName] = useState(initial.displayName);
  const [goal, setGoal] = useState<1 | 2 | 3>(initial.dailyGoal);
  const [reminder, setReminder] = useState(initial.reminder);
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const [pending, start] = useTransition();

  const save = () => start(async () => {
    const res = await saveProfile({ displayName: name, dailyGoal: goal, reminder: reminder || null });
    setStatus(res.ok ? "saved" : "failed");
    if (res.ok) { play("ui-toggle-on"); router.refresh(); }
  });

  return (
    <div className="profile">
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      <section className="card profile-card">
        <div className="field">
          <label htmlFor="pf-name">{t("name")}</label>
          <div className="input"><span className="ph ph-user" aria-hidden="true" /><input id="pf-name" value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setStatus("idle"); }} /></div>
          <span className="help ltr" style={{ textAlign: "start" }}>{email}</span>
        </div>
        <div className="field">
          <span className="label-like" id="pf-goal">{o("goal")}</span>
          <div className="ob-opts" role="radiogroup" aria-labelledby="pf-goal">
            {([1, 2, 3] as const).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={goal === n} className={`choice press sm${goal === n ? " is-selected" : ""}`} onClick={() => { setGoal(n); setStatus("idle"); play("select-snap"); }}>
                <span className="grow ob-opt-t" style={{ paddingInlineStart: 8 }}>{o(`goal${n}`)}</span>
                <span className={`radio${goal === n ? " is-on" : ""}`} aria-hidden="true" style={{ minBlockSize: 0 }}><span className="dot" /></span>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="pf-reminder">{o("reminder")}</label>
          <div className="input" style={{ maxInlineSize: 200 }}><span className="ph ph-bell" aria-hidden="true" /><input id="pf-reminder" type="time" value={reminder} onChange={(e) => { setReminder(e.target.value); setStatus("idle"); }} /></div>
          <span className="help">{o("reminderNote")}</span>
        </div>
        <button type="button" className="btn btn-primary btn-lg press" onClick={save} disabled={pending || !name.trim()}>{t("save")}</button>
        {status === "saved" ? <p className="t-small" role="status" style={{ color: "var(--right-ink)", fontWeight: 700 }}>{t("saved")}</p> : null}
        {status === "failed" ? <p className="ob-err" role="alert">{t("failed")}</p> : null}
      </section>
      <section className="card profile-card">
        <div className="field"><span className="label-like">{t("theme")}</span><ThemeSwitch /></div>
        <div className="field only-mobile"><span className="label-like">{t("language")}</span><LocaleSwitch /></div>
      </section>
      <button type="button" className="btn btn-secondary press" onClick={() => start(async () => { await signOut(); router.push("/"); router.refresh(); })} disabled={pending}><span className="ph ph-signout" aria-hidden="true" />{t("signOut")}</button>
    </div>
  );
}
