/* eslint-disable @next/next/no-img-element */
"use client";
import { PathName } from "@/components/PathName";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { NavItem as Item } from "@/lib/nav";
import { initSound, play, readMuted, setMuted } from "@/lib/sound";
import { useNavProgress } from "@/lib/nav-progress";

function useActive() {
  const current = usePathname();
  // A tapped tab lights up at once, while its screen loads, instead of after the server answers.
  const nav = useNavProgress();
  const pathname = nav.active && nav.to?.startsWith("/app") ? nav.to : current;
  // As on the canvas: Streak sits under Home, Skills under Paths, Badges and certificates under Profile.
  const under = (...p: string[]) => p.some((x) => pathname === x || pathname.startsWith(`${x}/`));
  return (id: Item["id"]) => (id === "home" ? pathname === "/app" || under("/app/streak") : id === "paths" ? pathname.startsWith("/app/path") || under("/app/skills") : id === "review" ? under("/app/review") : under("/app/profile", "/app/badges", "/app/certificate", "/app/board"));
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

export type RailPath = {
  id: string; name: string; art: string; current: boolean;
  units: { id: string; title: string; state: "done" | "current" | "locked" | "open" }[];
};

/** Laptop: "Your paths" in the rail. Every path starts closed, the current one too; the caret opens its units. */
export function RailPaths({ paths }: { paths: RailPath[] }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <>
      {paths.map((p) => {
        const on = !!open[p.id];
        const listId = `rail-units-${p.id}`;
        return (
          <div key={p.id} className="dk-path">
            <div className="dk-path-row">
              <Link href={`/app/path/${p.id}`} className={`dk-layer${p.current ? " is-on" : ""}`} aria-current={p.current ? "true" : undefined}>
                <img src={p.art} alt="" style={{ inlineSize: 22, blockSize: 22, flex: "none" }} /><span style={{ flex: 1, minInlineSize: 0, lineHeight: 1.35 }}><PathName name={p.name} /></span>
              </Link>
              <button type="button" className="dk-tog" aria-expanded={on} aria-controls={listId} aria-label={t("pathUnits", { name: p.name })} onClick={() => setOpen({ ...open, [p.id]: !on })}>
                <span className="ph ph-caret-down" aria-hidden="true" />
              </button>
            </div>
            {on ? (
              <ul id={listId} className="dk-units">
                {p.units.map((u) => (
                  <li key={u.id}>
                    <Link href={`/app/path/${p.id}#${u.id}`} className={`dk-unit${u.state === "done" ? " is-done" : u.state === "current" ? " is-cur" : u.state === "locked" ? " is-lock" : ""}`} aria-current={u.state === "current" ? "step" : undefined}>
                      <span className={`ph ph-${u.state === "done" ? "check-circle-fill" : u.state === "current" ? "play" : u.state === "locked" ? "lock" : "circle"}`} aria-hidden="true" />{u.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
