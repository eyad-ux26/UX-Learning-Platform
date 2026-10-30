"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { NavItem as Item } from "@/lib/nav";
import { initSound, play, readMuted, setMuted } from "@/lib/sound";

function useActive() {
  const pathname = usePathname();
  return (id: Item["id"]) => (id === "home" ? pathname === "/app" : id === "paths" ? pathname.startsWith("/app/path") : pathname.startsWith("/app/profile"));
}

/** Phone: the floating toolbar at the bottom. */
export function BottomNav({ items }: { items: Item[] }) {
  const t = useTranslations("nav");
  const active = useActive();
  useEffect(() => { initSound(); }, []);
  return (
    <div className="app-bnav">
      <nav className="bnav" aria-label={t("label")}>
        {items.map((it) => (
          <Link key={it.id} href={it.href} className={active(it.id) ? "is-on" : undefined} aria-current={active(it.id) ? "page" : undefined} onClick={() => play("nav-switch")}>
            <span className={`ph ph-${active(it.id) ? it.iconOn : it.icon}`} aria-hidden="true" />{t(it.id)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Laptop: the destinations in the left rail. */
export function RailItems({ items }: { items: Item[] }) {
  const t = useTranslations("nav");
  const active = useActive();
  return (
    <>
      {items.map((it) => (
        <Link key={it.id} href={it.href} className={`dk-item${active(it.id) ? " is-on" : ""}`} aria-current={active(it.id) ? "page" : undefined} onClick={() => play("nav-switch")}>
          <span className={`ph ph-${active(it.id) ? it.iconOn : it.icon}`} aria-hidden="true" />{t(it.id)}
        </Link>
      ))}
    </>
  );
}

/** Laptop: the sound switch at the foot of the rail. The choice is the same one the lesson header uses. */
export function RailSound() {
  const c = useTranslations("common");
  const [muted, setMutedState] = useState(false);
  useEffect(() => { initSound(); setMutedState(readMuted()); }, []);
  return (
    <button type="button" className="dk-layer rail-btn" role="switch" aria-checked={!muted} onClick={() => { const v = !muted; setMuted(v); setMutedState(v); if (!v) play("ui-toggle-on"); }}>
      <span className={`ph ph-${muted ? "speaker-slash" : "speaker-high"}`} aria-hidden="true" />{c("sound")}
      <span style={{ flex: 1 }} />
      <span className={`switch${muted ? "" : " is-on"}`} aria-hidden="true"><span className="track" /></span>
    </button>
  );
}
