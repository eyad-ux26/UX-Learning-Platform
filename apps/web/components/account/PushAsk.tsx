"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { askedBefore, markAsked, pushSupported, turnOnPush } from "@/lib/push-client";
import { play } from "@/lib/sound";
import { Sheet } from "./Sheet";

/**
 * Our own push ask, shown when the first lesson ends (signed in, in the app). We ask once on each device: after
 * "Not now", or after the browser's own prompt, it never shows again here. Reminders still come by email either way.
 */
export function PushAsk() {
  const t = useTranslations("push");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pathname.startsWith("/app") || !pushSupported() || askedBefore() || Notification.permission !== "default") return;
    const id = setTimeout(() => { setOpen(true); play("sheet-up"); }, 1200);
    return () => clearTimeout(id);
  }, [pathname]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 6000); return () => clearTimeout(id); }, [toast]);

  const later = () => { markAsked(); setOpen(false); setToast(t("later")); };
  const yes = async () => {
    setBusy(true);
    const s = await turnOnPush().catch(() => "off" as const);
    setBusy(false);
    setOpen(false);
    setToast(s === "on" ? t("done") : s === "blocked" ? t("blocked") : t("later"));
  };

  return (
    <>
      {open ? (
        <Sheet titleId="push-ask-t" onClose={later}>
          <img className="ill pop" src="/ill/uxgate-ill-bell.png" alt="" width={88} height={88} />
          <h2 id="push-ask-t" style={{ textAlign: "center" }}>{t("title")}</h2>
          <p className="t-small ink-2" style={{ textAlign: "center", fontSize: 15, margin: 0 }}>{t("bodyNoTime")}</p>
          <ul className="ask-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {[["ph-bell", "l1"], ["ph-chat-text", "l2"], ["ph-gear", "l3"]].map(([icon, k]) => <li key={k} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.45 }}><span className={`ph ${icon}`} style={{ fontSize: 20, color: "var(--link)", flex: "none" }} aria-hidden="true" /><span>{t(k)}</span></li>)}
          </ul>
          <button type="button" className="btn btn-primary btn-lg btn-block press" style={{ marginBlockStart: 4 }} onClick={yes} disabled={busy} aria-busy={busy || undefined}><span className="ph ph-bell" aria-hidden="true" />{t("yes")}</button>
          <button type="button" className="btn btn-ghost btn-block" style={{ minBlockSize: 44 }} onClick={later} disabled={busy}>{t("notNow")}</button>
          <p className="t-small ink-3" style={{ textAlign: "center", fontSize: 12.5, margin: 0 }}>{t("foot")}</p>
        </Sheet>
      ) : null}
      {toast ? <div className="toast pop s4-toast" role="status"><span className="ph ph-mail" aria-hidden="true" /><span style={{ flex: 1 }}>{toast}</span></div> : null}
    </>
  );
}
