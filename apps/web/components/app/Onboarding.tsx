"use client";
/* eslint-disable @next/next/no-img-element */

import { PathName } from "@/components/PathName";
import { useEffect, useState, useTransition } from "react";
import { SAMPLE_KEPT } from "@/components/lesson/GuestHandoff";
import { useLocale, useTranslations } from "next-intl";
import { ReminderField } from "@/components/app/ReminderField";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/Logo";
import { useRouter } from "@/i18n/navigation";
import { FOCUSES, GOALS, focusOpen, type OnboardingInput } from "@/lib/onboarding";
import { DEFAULT_REMINDER } from "@/lib/reminder";
import { play } from "@/lib/sound";
import { saveOnboarding } from "@/app/[locale]/onboarding/actions";
import { CATALOG, localPathName, pathArtUrl } from "@/lib/catalog-list";

type Goal = (typeof GOALS)[number];
type Focus = (typeof FOCUSES)[number];

const GOAL_ICON: Record<Goal, string> = { g1: "target", g2: "star", g3: "sparkle", g4: "map" };
const FOCUS_IMG: Record<Focus, string | null> = {
  forms: "path-forms",
  hier: "path-hierarchy",
  usab: "path-usability",
  none: null,
};
const FOCUS_NAME: Record<Focus, string> = {
  forms: "Forms That Flow",
  hier: "Visual Hierarchy in Action",
  usab: "Find and Fix Usability",
  none: "",
};

/** `playable`: ids of the paths that have lessons (the rest show as Coming soon), passed in so no content ships to the browser. */
export function Onboarding({ playable }: { playable: string[] }) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [dailyGoal, setDailyGoal] = useState<1 | 2 | 3>(1);
  const [reminder, setReminder] = useState<string | null>(DEFAULT_REMINDER);
  const [showAll, setShowAll] = useState(false);
  const [pathChoice, setPathChoice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Came from the sample lesson (P01) and chose to keep the result: say it is saved, and start on that path.
  const [fromSample, setFromSample] = useState(false);
  useEffect(() => {
    let kept = false;
    try {
      kept = sessionStorage.getItem(SAMPLE_KEPT) === "1" || !!localStorage.getItem("ug-guest-handoff");
    } catch {
      /* private mode */
    }
    if (kept) {
      setFromSample(true);
      setFocus((f) => f ?? "forms");
      setPathChoice((p) => p ?? "P01");
    }
  }, []);
  const [pending, start] = useTransition();

  // Design audit U2: question 3 no longer asks for time each week, so weekly_time is saved empty (the column stays for older answers).
  const submit = (skipped: boolean) => {
    const input: OnboardingInput = {
      goal,
      focus,
      weeklyTime: null,
      dailyGoal,
      reminder: skipped ? null : reminder,
      skipped,
      pathId: pathChoice,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    };
    setFailed(false);
    start(async () => {
      const res = await saveOnboarding(input);
      if (res.ok) {
        try {
          sessionStorage.removeItem(SAMPLE_KEPT);
        } catch {
          /* private mode */
        }
        router.push("/app");
      } else setFailed(true);
    });
  };
  const next = () => {
    play("ui-tap");
    if (step === 3) submit(false);
    else setStep((step + 1) as 2 | 3);
  };
  const back = () => {
    play("ui-tap");
    if (step > 1) setStep((step - 1) as 1 | 2);
  };

  const title = { 1: t("q1"), 2: t("q2"), 3: t("q3") }[step];
  const sub = { 1: t("q1sub"), 2: t("q2sub"), 3: t("q3sub") }[step];
  const rest = focus ? (
    focus === "none" ? (
      <span>{t("sugg_none")}</span>
    ) : (
      <>{t(`sugg_${focus}`).replace(/^[,،]\s*/, "")}</>
    )
  ) : null;
  const soon =
    focus && focus !== "none" && !focusOpen(focus, playable) ? (
      <span style={{ display: "block", marginBlockStart: 4 }}>{t("suggSoon")}</span>
    ) : null;
  const sugg = focus ? (
    <>
      {focus === "none" ? (
        <span>{t("sugg_none")}</span>
      ) : (
        <>
          <b className="ltr">{FOCUS_NAME[focus]}</b>
          {t(`sugg_${focus}`)}
        </>
      )}
      {focus !== "none" && !focusOpen(focus, playable) ? (
        <span style={{ display: "block", marginBlockStart: 4 }}>{t("suggSoon")}</span>
      ) : null}
    </>
  ) : null;

  return (
    <div className="ob">
      <header className="ob-head">
        {step > 1 ? (
          <button type="button" className="icon-btn plain only-mobile" aria-label={t("back")} onClick={back}>
            <span className="ph ph-arrow back" aria-hidden="true" />
          </button>
        ) : (
          <span className="only-mobile" style={{ inlineSize: 44 }} />
        )}
        <span className="only-desk">
          <Logo height={32} />
        </span>
        <div
          className="ob-bars"
          role="progressbar"
          aria-label={t("step", { n: step })}
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={3}
        >
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= step ? "on" : undefined} />
          ))}
        </div>
        <LocaleSwitch />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ paddingInline: 12 }}
          onClick={() => submit(true)}
          disabled={pending}
        >
          {t("skip")}
        </button>
      </header>

      <div className="ob-main" data-side={step === 2 ? "1" : undefined}>
        <main className="ob-body">
          <p className="t-over num" style={{ color: "var(--link)" }}>
            {t("step", { n: step })}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBlockStart: -6 }}>
            <h1 className="t-h1 h1-s" aria-live="polite">
              {title}
            </h1>
            <p className="t-body ink-2">{sub}</p>
          </div>

          {step === 1 ? (
            <div className="ob-opts" role="radiogroup" aria-label={title}>
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={goal === g}
                  className={`choice press sm${goal === g ? " is-selected" : ""}`}
                  onClick={() => {
                    setGoal(g);
                    play("select-snap");
                  }}
                >
                  <span className="ob-ico">
                    <span className={`ph ph-${GOAL_ICON[g]}`} aria-hidden="true" />
                  </span>
                  <span className="grow ob-opt-t">{t(g)}</span>
                  <span className={`radio${goal === g ? " is-on" : ""}`} aria-hidden="true" style={{ minBlockSize: 0 }}>
                    <span className="dot" />
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <>
              {fromSample ? (
                <div
                  className="calm"
                  role="status"
                  style={{ background: "var(--mint)", borderColor: "var(--right-line)" }}
                >
                  <span className="ob-kept-ico">
                    <span className="ph ph-cloud-check-fill" aria-hidden="true" />
                  </span>
                  <div className="grow">
                    <b>{t("sampleKept")}</b>
                    <span>{t("sampleKeptBody")}</span>
                  </div>
                </div>
              ) : null}
              <div className="ob-opts" role="radiogroup" aria-label={title}>
                {FOCUSES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={focus === f}
                    className={`choice press${focus === f ? " is-selected" : ""}`}
                    onClick={() => {
                      setFocus(f);
                      play("select-snap");
                    }}
                  >
                    <span className="ob-ico">
                      {FOCUS_IMG[f] ? (
                        <img src={`/ill/uxgate-ill-${FOCUS_IMG[f]}.png`} alt="" />
                      ) : (
                        <span className="ph ph-question" aria-hidden="true" />
                      )}
                    </span>
                    <span className="grow ob-opt-t">
                      {t(`p_${f}`)}
                      {f === "none" ? <small>{t("p_none_note")}</small> : null}
                    </span>
                    <span
                      className={`radio${focus === f ? " is-on" : ""}`}
                      aria-hidden="true"
                      style={{ minBlockSize: 0 }}
                    >
                      <span className="dot" />
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-expanded={showAll}
                onClick={() => setShowAll(!showAll)}
                style={{ alignSelf: "flex-start" }}
              >
                {t("seeAll", { count: CATALOG.length })}
              </button>
              {showAll ? (
                <div className="ob-opts" role="radiogroup" aria-label={t("allTitle")}>
                  <p className="t-small ink-2">{t("allBody")}</p>
                  {CATALOG.map((p) => {
                    const open = playable.includes(p.id);
                    const on = pathChoice === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-disabled={!open}
                        disabled={!open}
                        className={`choice press sm${on ? " is-selected" : ""}`}
                        onClick={() => {
                          setPathChoice(p.id);
                          play("select-snap");
                        }}
                      >
                        <span className="ob-ico">
                          <img src={pathArtUrl(p.id)} alt="" />
                        </span>
                        <span className="grow ob-opt-t">
                          <PathName name={localPathName(p.id, locale)} />
                          {!open ? <small>{t("soon")}</small> : null}
                        </span>
                        <span className={`radio${on ? " is-on" : ""}`} aria-hidden="true" style={{ minBlockSize: 0 }}>
                          <span className="dot" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {sugg ? (
                <div className="sugg only-mobile" role="status">
                  <span className="ph ph-sparkle" aria-hidden="true" />
                  <p className="t-small">
                    <b>{t("weSuggest")}</b> {sugg}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <p className="ob-label">{t("goal")}</p>
              <div className="ob-opts ob-goals" role="radiogroup" aria-label={t("goal")}>
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={dailyGoal === n}
                    className={`choice press sm${dailyGoal === n ? " is-selected" : ""}`}
                    onClick={() => {
                      setDailyGoal(n);
                      play("select-snap");
                    }}
                  >
                    <span className="grow ob-opt-t" style={{ paddingInlineStart: 8 }}>
                      {t(`goal${n}`)}
                      <small>{t(`goalNote${n}`)}</small>
                    </span>
                    <span
                      className={`radio${dailyGoal === n ? " is-on" : ""}`}
                      aria-hidden="true"
                      style={{ minBlockSize: 0 }}
                    >
                      <span className="dot" />
                    </span>
                  </button>
                ))}
              </div>
              <ReminderField value={reminder} onChange={setReminder} />
            </>
          ) : null}
          {failed ? (
            <p className="ob-err" role="alert">
              {t("saveFailed")}
            </p>
          ) : null}
        </main>

        {step === 2 && focus ? (
          <aside className="ob-side" aria-label={t("startPath")}>
            <span className="frame-label">
              <span className="ph ph-hash" aria-hidden="true" />
              {t("startPath")}
            </span>
            <section className="card-panel ob-side-card">
              {FOCUS_IMG[focus] ? <img src={`/ill/uxgate-ill-${FOCUS_IMG[focus]}.png`} alt="" /> : null}
              {FOCUS_NAME[focus] ? (
                <p className="t-h3 ltr" style={{ color: "var(--panel-ink)" }}>
                  {FOCUS_NAME[focus]}
                </p>
              ) : null}
              <p className="t-small" style={{ color: "var(--ink-2)" }}>
                {rest}
                {soon}
              </p>
            </section>
          </aside>
        ) : null}
      </div>

      <footer className="ob-foot" data-side={step === 2 ? "1" : undefined}>
        <div className="ob-foot-btns">
          {step > 1 ? (
            <button type="button" className="btn btn-secondary btn-lg press" onClick={back} disabled={pending}>
              <span className="ph ph-arrow back only-desk" aria-hidden="true" />
              {t("back")}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-lg press"
            onClick={next}
            disabled={pending || (step === 2 && !focus && !pathChoice)}
            aria-busy={pending || undefined}
          >
            {step === 3 ? t("startLearning") : t("cont")}
            <span className="ph ph-arrow flip only-desk" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}
