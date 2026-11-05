"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { inboxCopy, safeHref, shortAgo, type InboxData } from "@/lib/inbox";
import type { InboxKind } from "@/lib/notifications";
import { play } from "@/lib/sound";
import { markRead } from "@/app/[locale]/app/(shell)/settings/actions";
import { PageTopClient } from "./PageTopClient";

type Row = { id: string; kind: string; data: Record<string, unknown>; href: string | null; read_at: string | null; created_at: string };

export function InboxView({ rows: initial }: { rows: Row[] }) {
  const t = useTranslations("inbox");
  const s = useTranslations("settings");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [now, setNow] = useState<Date | null>(null);
  const [, start] = useTransition();
  useEffect(() => { setNow(new Date()); }, []);
  const unread = rows.filter((r) => !r.read_at);
  const read = rows.filter((r) => r.read_at);

  const open = (r: Row) => {
    play("ui-tap");
    if (!r.read_at) { setRows((all) => all.map((x) => (x.id === r.id ? { ...x, read_at: new Date().toISOString() } : x))); start(async () => { await markRead({ ids: [r.id] }).catch(() => null); }); }
    router.push(safeHref(r.href));
  };
  const markAll = () => {
    play("ui-tap");
    setRows((all) => all.map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() })));
    start(async () => { await markRead({}).catch(() => null); router.refresh(); });
  };
  const time = (at: string) => {
    if (!now) return "";
    const a = shortAgo(at, now, locale);
    return a.key ? t(a.key, { count: a.count ?? 0 }) : a.text ?? "";
  };
  const item = (r: Row) => {
    const c = inboxCopy(r.kind as InboxKind, r.data as InboxData, locale);
    const title = t(c.title, c.values);
    const body = t(c.body, c.values);
    const go = t(c.go);
    const isNew = !r.read_at;
    return (
      <li key={r.id} style={{ listStyle: "none" }}>
        <button type="button" className={`inb-row${isNew ? " is-new" : ""}`} onClick={() => open(r)} aria-label={`${title}. ${body}. ${go}`}>
          <span className={`inb-ic ${c.tone}`} aria-hidden="true"><span className={`ph ${c.icon}`} /></span>
          <span className="grow"><b>{title}</b><span>{body}</span><span className="inb-meta"><span className="to">{go}<span className="ph ph-caret-right flip" style={{ fontSize: 12 }} aria-hidden="true" /></span></span></span>
          <span className="inb-end"><span className="inb-time">{time(r.created_at)}</span>{isNew ? <span className="inb-dot" aria-hidden="true" /> : null}</span>
        </button>
      </li>
    );
  };

  return (
    <>
      <PageTopClient title={t("title")} back="/app" backLabel={s("back")}>
        {unread.length ? <button type="button" className="pg-link" onClick={markAll} style={{ background: "none", border: 0, font: "inherit", cursor: "pointer", color: "var(--link)" }}><span className="ph ph-checks" aria-hidden="true" />{t("markAll")}</button>
          : <Link href="/app/settings/notifications" className="icon-btn plain" aria-label={t("choices")}><span className="ph ph-gear" aria-hidden="true" /></Link>}
      </PageTopClient>
      {rows.length === 0 ? (
        <section className="empty" style={{ minBlockSize: "50dvh" }}>
          <img className="pop" src="/ill/uxgate-ill-empty-box.png" alt="" width={120} height={120} />
          <h2>{t("emptyTitle")}</h2>
          <p>{t("emptyBody")}</p>
          <Link href="/app/settings/notifications" className="btn btn-secondary btn-sm press" style={{ marginBlockStart: 6 }}><span className="ph ph-gear" aria-hidden="true" />{t("choices")}</Link>
        </section>
      ) : (
        <div className="s4-split">
          <div className="pg-stack" style={{ gap: 10 }}>
            {unread.length ? <><h2 className="t-over set-sec">{t("gNew", { count: unread.length })}</h2><ul className="inb" style={{ margin: 0, padding: 0 }}>{unread.map(item)}</ul></> : null}
            {read.length ? <><h2 className="t-over set-sec">{t("gOld")}</h2><ul className="inb" style={{ margin: 0, padding: 0 }}>{read.map(item)}</ul></> : null}
          </div>
          <aside className="pg-stack s4-only-desk" style={{ flexDirection: "column" }}>
            <section className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 className="t-over" style={{ margin: 0 }}>{t("whereTitle")}</h2>
              {[["ph-bell", "w1"], ["ph-review", "w2"], ["ph-star", "w3"], ["ph-chat-text", "w4"]].map(([icon, k]) => <p key={k} className="pg-note" style={{ fontSize: 14 }}><span className={`ph ${icon}`} aria-hidden="true" /><span>{t(k)}</span></p>)}
              <Link href="/app/settings/notifications" className="btn btn-secondary btn-sm press" style={{ alignSelf: "flex-start", marginBlockStart: 4 }}><span className="ph ph-gear" aria-hidden="true" />{t("choices")}</Link>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
