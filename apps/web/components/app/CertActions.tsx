"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sheet } from "@/components/account/Sheet";
import { setCertificatePublic } from "@/app/[locale]/app/(shell)/certificate/[pathId]/actions";
import { linkedInFeedUrl, linkedInProfileUrl, postText } from "@/lib/certificate-share";

type Props = {
  pathId: string; pathName: string; name: string; code: string; issuedAt: string; id: string; skills: number; checks: number;
  initialPublic: boolean; url: string; cardArt: React.ReactNode;
};

/**
 * The certificate page actions (design S3-16): Share on LinkedIn (a sheet with the ready post), Add to LinkedIn profile, PDF, Image,
 * Copy link, and the page switch. Anything that sends a link out turns the certificate page on first, because LinkedIn has to open it.
 * LinkedIn's share links cannot carry an image: the picture reaches the post through the page's og:image.
 */
export function CertActions(p: Props) {
  const t = useTranslations("cert");
  const locale = useLocale();
  const [on, setOn] = useState(p.initialPublic);
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const opener = useRef<HTMLButtonElement>(null);
  const text = postText({ intro: t("postIntro", { path: p.pathName, skills: p.skills, checks: p.checks }), seeIt: t("postSee"), tags: t("postTags") }, p.url);
  const say = (m: string) => { setLive(""); setTimeout(() => setLive(m), 30); };
  // The confirmation toast goes away by itself after 4 seconds, and has a close button.
  useEffect(() => { if (!live) return; const id = setTimeout(() => setLive(""), 4000); return () => clearTimeout(id); }, [live]);

  const ensureOn = async (): Promise<boolean> => {
    if (on) return true;
    const r = await setCertificatePublic({ pathId: p.pathId, on: true });
    if (r.ok) setOn(true); else setFailed(true);
    return r.ok;
  };
  const copy = async (s: string) => { try { await navigator.clipboard.writeText(s); return true; } catch { return false; } };
  // The new tab opens in the click itself, so a pop-up blocker allows it, and is pointed at LinkedIn once the page is on.
  const openTab = () => window.open("about:blank", "_blank");
  const go = (w: Window | null, to: string) => { if (w) { w.opener = null; w.location.href = to; } else window.location.href = to; };

  const share = () => {
    const w = openTab();
    start(async () => {
      setFailed(false);
      if (!(await ensureOn())) { w?.close(); return; }
      if (await copy(text)) say(t("copiedLive"));
      go(w, linkedInFeedUrl(text));
    });
  };
  const addProfile = () => {
    const w = openTab();
    start(async () => {
      setFailed(false);
      if (!(await ensureOn())) { w?.close(); return; }
      go(w, linkedInProfileUrl({ pathName: p.pathName, issuedAt: p.issuedAt, url: p.url, id: p.id }));
    });
  };
  const copyLink = () => start(async () => {
    setFailed(false);
    if (!(await ensureOn())) return;
    if (await copy(p.url)) say(t("copiedLive"));
  });
  const toggle = () => start(async () => {
    setFailed(false);
    const r = await setCertificatePublic({ pathId: p.pathId, on: !on });
    if (r.ok) setOn(!on); else setFailed(true);
  });

  return (
    <>
      <button ref={opener} type="button" className="btn btn-primary btn-lg press cxp-li" onClick={() => setOpen(true)}><span className="li-glyph" aria-hidden="true">in</span>{t("li")}</button>
      <button type="button" className="btn btn-secondary press" onClick={addProfile} disabled={pending} aria-busy={pending || undefined}><span className="ph ph-plus" aria-hidden="true" />{t("addProfile")}</button>
      <div className="cxp-mini" role="group" aria-label={t("more")}>
        <button type="button" className="cxp-mini-btn press" onClick={() => window.print()}><span className="ph ph-download" aria-hidden="true" />{t("pdf")}</button>
        <a className="cxp-mini-btn press" href={`/${locale}/app/certificate/${p.pathId}/og.png`} download={`uxgate-certificate-${p.pathId}.png`}><span className="ph ph-download" aria-hidden="true" />{t("img")}</a>
        <button type="button" className="cxp-mini-btn press" onClick={copyLink} disabled={pending}><span className="ph ph-link" aria-hidden="true" />{t("copyLink")}</button>
      </div>
      <div className="set">
        <div className="set-row">
          <span className="ph ph-globe" aria-hidden="true" />
          <span className="set-l">{t("pageTitle")}<small>{on ? t("pageOn") : t("pageOff")}</small></span>
          <button type="button" role="switch" aria-checked={on} aria-label={t("pageTitle")} className={`switch sw-only${on ? " is-on" : ""}`} onClick={toggle} disabled={pending}><span className="track" aria-hidden="true" /></button>
        </div>
        <div className="set-row"><span className="ph ph-seal-check-fill" aria-hidden="true" /><span className="set-l">{t("verifyRow")}<small className="ltr" style={{ textAlign: "start" }}>uxgate.org/c/{p.code} · {p.id}</small></span></div>
      </div>
      <p className="cxp-note"><span className="ph ph-eye" aria-hidden="true" /><span>{t("sees2")}</span></p>
      {failed ? <p className="ob-err" role="alert">{t("failed2")}</p> : null}
      <p className="lp-sr" role="status" aria-live="polite">{live}</p>
      {live ? <div className="toast pop s4-toast"><span className="ph ph-check-circle-fill" aria-hidden="true" /><span style={{ flex: 1 }} aria-hidden="true">{live}</span><button type="button" className="icon-btn plain" aria-label={t("close")} onClick={() => setLive("")}><span className="ph ph-x" aria-hidden="true" /></button></div> : null}

      {open ? (
        <Sheet titleId="cxs-h" onClose={() => { setOpen(false); opener.current?.focus(); }}>
          <div className="cxs-wrap">
            <header className="cxs-head">
              <span className="li-glyph is-lg" aria-hidden="true">in</span>
              <h2 id="cxs-h">{t("shTitle")}</h2>
              <button type="button" className="icon-btn plain" aria-label={t("close")} onClick={() => { setOpen(false); opener.current?.focus(); }}><span className="ph ph-x" aria-hidden="true" /></button>
            </header>
            <p className="cxs-label">{t("shPost")}</p>
            <div className="cxs-post" tabIndex={0} role="group" aria-label={t("shPost")}>
              {text.split("\n\n").map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <p className="cxs-label">{t("preview")}</p>
            <div className="cxs-card">
              {p.cardArt}
              <div className="cxs-card-text"><b>{t("cardTitle", { name: p.name, path: p.pathName })}</b><span className="ltr">uxgate.org</span></div>
            </div>
            {!on ? <p className="cxs-notice"><span className="ph ph-info" aria-hidden="true" /><span>{t("notice")}</span></p> : null}
            <div className="cxs-acts">
              <button type="button" data-autofocus className="btn btn-primary btn-lg press" onClick={share} disabled={pending} aria-busy={pending || undefined}><span className="li-glyph" aria-hidden="true">in</span>{t("open")}</button>
              <button type="button" className="btn btn-ghost press" onClick={() => { setOpen(false); opener.current?.focus(); }}>{t("cancel")}</button>
            </div>
            <p className="t-small ink-2 cxs-foot">{t("openNote")}</p>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
