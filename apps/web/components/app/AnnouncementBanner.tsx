"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type Announcement = { id: string; title: string; body: string; link: string | null };

const KEY = "ug_announcement_closed";

/** A banner from the admin panel's Communications (0063). Closing it hides that one on this device. */
export function AnnouncementBanner({ a, open, close }: { a: Announcement; open: string; close: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let closed: string | null = null;
    try { closed = localStorage.getItem(KEY); } catch { /* private mode: show it */ }
    setShown(closed !== a.id);
  }, [a.id]);
  if (!shown) return null;
  return (
    <section className="card freeze-note" role="status" aria-label={a.title}>
      <span className="ph ph-megaphone" aria-hidden="true" style={{ fontSize: 28, color: "var(--hl-ledge)", flex: "none" }} />
      <div style={{ flex: 1, minInlineSize: 0 }}>
        <p className="t-label">{a.title}</p>
        <p className="t-small ink-2">{a.body}</p>
        {a.link ? <Link className="t-small" href={a.link} style={{ fontWeight: 700 }}>{open}</Link> : null}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShown(false); try { localStorage.setItem(KEY, a.id); } catch { /* fine */ } }}>{close}</button>
    </section>
  );
}
