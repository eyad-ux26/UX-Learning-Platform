"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale, VideoStep } from "@uxgate/content/types";

export type VideoSource = { src: string; kind: "hls" | "mp4" };
type T = (key: string, values?: Record<string, string | number>) => string;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * A clip with captions and a transcript in both languages. It never starts by itself: the learner presses play.
 * The source is asked for when the step opens (a signed address), so a link that expired is simply asked for again.
 */
export function VideoStepView({ step, locale, t, getSource, headingRef }: {
  step: VideoStep; locale: Locale; t: T; getSource?: (id: string) => Promise<VideoSource>; headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<VideoSource | "loading" | "error">("loading");
  const [playing, setPlaying] = useState(false);
  const [tapIcon, setTapIcon] = useState<{ n: number; play: boolean } | null>(null); // brief icon after a tap on the video
  useEffect(() => { if (!tapIcon) return; const id = setTimeout(() => setTapIcon(null), 600); return () => clearTimeout(id); }, [tapIcon]);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(step.duration);
  const [cc, setCc] = useState(true);
  const [capLang, setCapLang] = useState<Locale>(locale);
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);

  const load = useCallback(() => {
    setSrc("loading");
    (getSource ? getSource(step.video) : Promise.reject(new Error("no source"))).then(setSrc).catch(() => setSrc("error"));
  }, [getSource, step.video]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOpen(window.matchMedia("(min-width: 1024px)").matches); }, []);

  // Attach the source. Safari plays HLS itself; other browsers get hls.js, loaded only when a clip needs it.
  useEffect(() => {
    const v = ref.current;
    if (!v || typeof src === "string") return;
    let hls: { destroy: () => void } | null = null;
    let alive = true;
    if (src.kind === "mp4" || v.canPlayType("application/vnd.apple.mpegurl")) v.src = src.src;
    else import("hls.js").then(({ default: Hls }) => {
      if (!alive || !Hls.isSupported()) return setSrc("error");
      const h = new Hls();
      h.loadSource(src.src); h.attachMedia(v);
      h.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) setSrc("error"); });
      hls = h;
    }).catch(() => setSrc("error"));
    return () => { alive = false; hls?.destroy(); };
  }, [src]);

  const toggle = () => { const v = ref.current; if (!v) return; if (v.paused) { setEnded(false); void v.play().catch(() => setPlaying(false)); } else v.pause(); };
  const seek = (to: number) => { const v = ref.current; if (v) { v.currentTime = to; setTime(to); } };
  const setSpeed = (r: number) => { setRate(r); setSpeedOpen(false); if (ref.current) ref.current.playbackRate = r; };
  const replay = () => { seek(0); setEnded(false); void ref.current?.play(); };

  const lines = step.transcript;
  const nowIdx = lines.reduce((acc, l, k) => (l.t <= time ? k : acc), -1);
  const cap = nowIdx >= 0 ? lines[nowIdx][capLang] : "";
  const ready = typeof src !== "string";

  return (
    <section className="player-col lp-videostep">
      {step.title ? <h1 ref={headingRef} tabIndex={-1} className="t-h2">{step.title[locale]}</h1> : <h1 ref={headingRef} tabIndex={-1} className="lp-sr">{t("videoLabel")}</h1>}
      <div className="lp-videowrap">
        <div className="lp-video" role="group" aria-label={t("videoLabel")}>
          <div className="stage" aria-hidden="true" />
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- captions are drawn from the transcript below, in both languages */}
          <video
            ref={ref} playsInline preload="metadata" className="lp-videoel" onClick={() => { if (ready && !ended) { setTapIcon((p) => ({ n: (p?.n ?? 0) + 1, play: !!ref.current?.paused })); toggle(); } }} aria-label={step.title?.[locale] ?? t("videoLabel")}
            onPlay={() => { setPlaying(true); setStarted(true); }} onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setEnded(true); }}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => { if (Number.isFinite(e.currentTarget.duration)) setDur(e.currentTarget.duration); }}
            onError={() => setSrc("error")}
          />
          {tapIcon ? <span key={tapIcon.n} className="lp-vtap" aria-hidden="true"><span className={`ph ph-${tapIcon.play ? "play" : "pause"}-fill`} /></span> : null}
          {src === "error" ? (
            <div className="lp-vmsg" role="alert"><span className="ph ph-wifi-slash" aria-hidden="true" /><p>{t("videoError")}</p><button type="button" className="btn btn-secondary press" onClick={load}>{t("videoRetry")}</button></div>
          ) : null}
          {ready && cc && cap && started && !ended ? <div className="cap" aria-hidden="true"><span lang={capLang} dir={capLang === "ar" ? "rtl" : "ltr"}>{cap}</span></div> : null}
          {ready && !playing && !ended ? (
            <button type="button" className="lp-vplay" onClick={toggle} aria-label={started ? t("videoResume") : t("videoPlay")}><span className="ph ph-play-fill" aria-hidden="true" /></button>
          ) : null}
          {ended ? (
            <div className="lp-vmsg"><p>{t("videoEnded")}</p><button type="button" className="btn btn-secondary press" onClick={replay}><span className="ph ph-arrow-counter-clockwise" aria-hidden="true" />{t("videoReplay")}</button></div>
          ) : null}
          <div className="ctl">
            <button type="button" className="lp-vbtn" disabled={!ready} onClick={toggle} aria-label={playing ? t("videoPause") : t("videoPlay")}><span className={`ph ${playing ? "ph-pause-fill" : "ph-play-fill"}`} aria-hidden="true" /></button>
            <input
              className="lp-vrange" type="range" min={0} max={Math.max(1, Math.round(dur))} step={1} value={Math.min(Math.round(time), Math.round(dur))}
              onChange={(e) => seek(Number(e.target.value))} disabled={!ready} aria-label={t("videoSeek")} aria-valuetext={`${clock(time)} / ${clock(dur)}`}
            />
            <span className="lp-vtime num ltr" aria-hidden="true">{clock(time)} / {clock(dur)}</span>
            <div className="lp-speed">
              <button type="button" className={`lp-vbtn lp-vspeed${rate !== 1 ? " is-on" : ""}`} aria-expanded={speedOpen} onClick={() => setSpeedOpen(!speedOpen)} aria-label={`${t("videoSpeed")}: ${rate}×`} dir="auto">{rate === 1 ? t("videoSpeedNormal") : `${rate}×`}</button>
              {speedOpen ? (
                <div className="lp-speedmenu" role="group" aria-label={t("videoSpeed")} onKeyDown={(e) => { if (e.key === "Escape") setSpeedOpen(false); }}>
                  {[0.75, 1, 1.25, 1.5, 2].map((r) => <button key={r} type="button" aria-pressed={rate === r} onClick={() => setSpeed(r)}>{r === 1 ? t("videoSpeedNormal") : `${r}×`}</button>)}
                </div>
              ) : null}
            </div>
            <button type="button" className={`lp-vbtn${cc ? " is-on" : ""}`} aria-pressed={cc} onClick={() => setCc(!cc)} aria-label={t("videoCaptions")}><span className="ph ph-closed-captioning" aria-hidden="true" /></button>
            <button type="button" className={`lp-vbtn${open ? " is-on" : ""}`} aria-pressed={open} onClick={() => setOpen(!open)} aria-label={t("videoTranscript")}><span className="ph ph-article" aria-hidden="true" /></button>
            <button type="button" className="lp-vbtn" onClick={() => void ref.current?.requestFullscreen?.().catch(() => {})} aria-label={t("videoFullscreen")}><span className="ph ph-corners-out" aria-hidden="true" /></button>
          </div>
        </div>
        <div className="lp-seg" role="group" aria-label={t("videoCaptionLang")}>
          {(["en", "ar"] as const).map((l) => <button key={l} type="button" aria-pressed={capLang === l} onClick={() => setCapLang(l)}>{l === "en" ? "English" : "العربية"}</button>)}
        </div>
      </div>
      {open ? (
        <ol className="lp-transcript" aria-label={t("videoTranscript")} style={{ listStyle: "none", margin: 0 }}>
          {lines.map((l, k) => (
            <li key={l.t}>
              <button type="button" className={`lp-line${k === nowIdx ? " is-now" : ""}`} aria-current={k === nowIdx || undefined} onClick={() => seek(l.t)} lang={capLang} dir={capLang === "ar" ? "rtl" : "ltr"} style={{ width: "100%", textAlign: "start", border: 0, background: "none", font: "inherit" }}>
                <span className="tm num ltr">{clock(l.t)}</span><span>{l[capLang]}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
