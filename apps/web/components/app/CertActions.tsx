"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Sheet } from "@/components/account/Sheet";
import { confirmCertificateName, setCertificatePublic } from "@/app/[locale]/app/(shell)/certificate/[pathId]/actions";
import { validCertName } from "@/lib/cert-name";
import { linkedInFeedUrl, linkedInProfileUrl, postText } from "@/lib/certificate-share";

type Props = {
  pathId: string; pathName: string; name: string; code: string; issuedAt: string; id: string; skills: number; checks: number;
  initialPublic: boolean; nameConfirmed: boolean; emailLike: boolean; url: string; cardArt: React.ReactNode;
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // The one-time name check: before the name is confirmed, every way of sharing or downloading opens it first.
  const [confirmed, setConfirmed] = useState(p.nameConfirmed);
  const [nameSheet, setNameSheet] = useState(!p.nameConfirmed);
  const [editing, setEditing] = useState(!p.nameConfirmed && p.emailLike);
  const [shownName, setShownName] = useState(p.name);
  const [draft, setDraft] = useState(p.name);
  const [nameErr, setNameErr] = useState(false);
  const gate = (e?: { preventDefault: () => void }): boolean => { if (confirmed) return false; e?.preventDefault(); setNameSheet(true); return true; };
  const closeName = () => { setNameSheet(false); setEditing(!confirmed && p.emailLike); setNameErr(false); };
  const saveName = (withDraft: boolean) => start(async () => {
    if (withDraft && !validCertName(draft)) { setNameErr(true); return; }
    const r = await confirmCertificateName(withDraft ? { name: draft } : {});
    if (!r.ok) { setNameErr(r.error === "length"); if (!r.error) setFailed(true); return; }
    setConfirmed(true); setNameSheet(false); setNameErr(false);
    if (r.name) { setShownName(r.name); setDraft(r.name); }
    router.refresh();
  });
  const [live, setLive] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const opener = useRef<HTMLButtonElement>(null);
  const versions = [1, 2, 3].map((n) => postText({ intro: t(n === 1 ? "postIntro" : (`postIntro${n}` as "postIntro2"), { path: p.pathName, skills: p.skills, checks: p.checks }), seeIt: t("postSee"), tags: t("postTags") }, p.url));
  const [ver, setVer] = useState(0);
  const [postDraft, setPostDraft] = useState(versions[0]);
  const text = postDraft;
  const pick = (i: number) => { setVer(i); setPostDraft(versions[i]); };
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
  // On phones a blank tab opened first never reaches the LinkedIn app, so there the same tab goes to LinkedIn.
  const isPhone = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const openTab = () => (isPhone() ? null : window.open("about:blank", "_blank"));
  const go = (w: Window | null, to: string) => { if (w) { w.opener = null; w.location.href = to; } else window.location.href = to; };

  const share = () => {
    if (gate()) return;
    // LinkedIn's phone app ignores the text in a link, so on phones the share sheet carries it: choosing LinkedIn there opens its composer with the text filled in.
    if (isPhone() && typeof navigator.share === "function") {
      start(async () => {
        setFailed(false);
        if (!(await ensureOn())) return;
        const copied = await copy(text);
        try { await navigator.share({ text }); if (copied) say(t("copiedLive")); }
        catch (e) { if ((e as Error)?.name !== "AbortError") go(null, linkedInFeedUrl(text)); }
      });
      return;
    }
    const w = openTab();
    start(async () => {
      setFailed(false);
      if (!(await ensureOn())) { w?.close(); return; }
      if (await copy(text)) say(t("copiedLive"));
      go(w, linkedInFeedUrl(text));
    });
  };
  const addProfile = () => {
    if (gate()) return;
    const w = openTab();
    start(async () => {
      setFailed(false);
      if (!(await ensureOn())) { w?.close(); return; }
      go(w, linkedInProfileUrl({ pathName: p.pathName, issuedAt: p.issuedAt, url: p.url, id: p.id }));
    });
  };
  const copyLink = () => { if (gate()) return; copyLinkNow(); };
  const copyLinkNow = () => start(async () => {
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
      <button ref={opener} type="button" className="btn btn-primary btn-lg press cxp-li" onClick={() => { if (!gate()) setOpen(true); }}><span className="li-glyph" aria-hidden="true">in</span>{t("li")}</button>
      <button type="button" className="btn btn-secondary press" onClick={addProfile} disabled={pending} aria-busy={pending || undefined}><span className="ph ph-plus" aria-hidden="true" />{t("addProfile")}</button>
      <div className="cxp-mini" role="group" aria-label={t("more")}>
        <a className="cxp-mini-btn press" href={`/${locale}/app/certificate/${p.pathId}/pdf`} download onClick={(e) => { gate(e); }}><span className="ph ph-download" aria-hidden="true" />{t("pdf")}</a>
        <a className="cxp-mini-btn press" href={`/${locale}/app/certificate/${p.pathId}/og.png`} download={`uxgate-certificate-${p.pathId}.png`} onClick={(e) => { gate(e); }}><span className="ph ph-download" aria-hidden="true" />{t("img")}</a>
        <button type="button" className="cxp-mini-btn press" onClick={copyLink} disabled={pending}><span className="ph ph-link" aria-hidden="true" />{t("copyLink")}</button>
      </div>
      <div className="set">
        <div className="set-row">
          <span className="ph ph-identification-card" aria-hidden="true" />
          <span className="set-l">{t("rowName")}<small dir="auto">{shownName}</small></span>
          <Link href="/app/settings" className="btn btn-ghost btn-sm">{t("rowEdit")}</Link>
        </div>
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

      {nameSheet ? (
        <Sheet titleId="cxn-h" onClose={closeName}>
          <div className="cxs-wrap">
            <header className="cxs-head">
              <span className="ph ph-certificate" aria-hidden="true" />
              <h2 id="cxn-h">{t("ncTitle")}</h2>
              <button type="button" className="icon-btn plain" aria-label={t("close")} onClick={closeName}><span className="ph ph-x" aria-hidden="true" /></button>
            </header>
            {editing ? (
              <>
                {p.emailLike ? <p className="t-small ink-2">{t("ncFixLine")}</p> : null}
                <div className="field">
                  <label htmlFor="cxn-name">{t("ncField")}</label>
                  <input id="cxn-name" className="input" value={draft} maxLength={80} autoComplete="name" aria-invalid={nameErr || undefined} aria-describedby={nameErr ? "cxn-err" : undefined}
                    onChange={(e) => { setDraft(e.target.value); setNameErr(false); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveName(true); } }} />
                  {nameErr ? <p id="cxn-err" className="ob-err" role="alert">{t("ncErr")}</p> : null}
                </div>
              </>
            ) : null}
            <p className="cxs-label">{t("ncShows")}</p>
            <div className="cxn-prev"><span dir="auto">{editing ? draft.trim() || "…" : shownName}</span></div>
            <div className="cxs-acts">
              {editing ? (
                <button type="button" data-autofocus className="btn btn-primary btn-lg press" onClick={() => saveName(true)} disabled={pending} aria-busy={pending || undefined}>{t("ncSave")}</button>
              ) : (
                <>
                  <button type="button" data-autofocus className="btn btn-primary btn-lg press" onClick={() => saveName(false)} disabled={pending} aria-busy={pending || undefined}>{t("ncYes")}</button>
                  <button type="button" className="btn btn-secondary press" onClick={() => setEditing(true)}>{t("ncEdit")}</button>
                </>
              )}
            </div>
            {failed ? <p className="ob-err" role="alert">{t("failed2")}</p> : null}
            <p className="t-small ink-2 cxs-foot">{t("ncFoot")}</p>
          </div>
        </Sheet>
      ) : null}
      {open ? (
        <Sheet titleId="cxs-h" onClose={() => { setOpen(false); opener.current?.focus(); }}>
          <div className="cxs-wrap">
            <header className="cxs-head">
              <span className="li-glyph is-lg" aria-hidden="true">in</span>
              <h2 id="cxs-h">{t("shTitle")}</h2>
              <button type="button" className="icon-btn plain" aria-label={t("close")} onClick={() => { setOpen(false); opener.current?.focus(); }}><span className="ph ph-x" aria-hidden="true" /></button>
            </header>
            <p className="cxs-label">{t("shPost")}</p>
            <div className="cxs-vers" role="radiogroup" aria-label={t("vLabel")}>
              {[t("v1"), t("v2"), t("v3")].map((l, i) => <button key={i} type="button" role="radio" aria-checked={ver === i} className={`chip${ver === i ? " is-on" : ""}`} onClick={() => pick(i)}>{l}</button>)}
            </div>
            <label className="lp-sr" htmlFor="cxs-text">{t("postEdit")}</label>
            <textarea id="cxs-text" className="cxs-post cxs-edit" dir="auto" rows={9} value={postDraft} onChange={(e) => setPostDraft(e.target.value)} />
            <p className="t-small ink-2">{t("editHint")}</p>
            <p className="cxs-label">{t("preview")}</p>
            <div className="cxs-card">
              {p.cardArt}
              <div className="cxs-card-text"><b>{t("cardTitle", { name: shownName, path: p.pathName })}</b><span className="ltr">uxgate.org</span></div>
            </div>
            {!on ? <p className="cxs-notice"><span className="ph ph-info" aria-hidden="true" /><span>{t("notice")}</span></p> : null}
            <div className="cxs-acts">
              <button type="button" data-autofocus className="btn btn-primary btn-lg press" onClick={share} disabled={pending || !postDraft.trim()} aria-busy={pending || undefined}><span className="li-glyph" aria-hidden="true">in</span>{t("open")}</button>
              <button type="button" className="btn btn-ghost press" onClick={() => { setOpen(false); opener.current?.focus(); }}>{t("cancel")}</button>
            </div>
            <p className="t-small ink-2 cxs-foot">{t("openNote")}</p>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
