"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const TABS = [
  { id: "pf-overview", key: "overview", icon: "squares-four" },
  { id: "pf-paths", key: "paths", icon: "path" },
  { id: "pf-certs", key: "certs", icon: "certificate" },
  { id: "pf-badges", key: "badges", icon: "medal" },
  { id: "pf-board", key: "board", icon: "ranking" },
] as const;

/** Scrolling tabs under the Profile title. They jump to a section and follow the reader as the page scrolls. */
export function ProfileTabs({ board }: { board: boolean }) {
  const t = useTranslations("profile.tabs");
  const tabs = TABS.filter((x) => board || x.id !== "pf-board");
  const [on, setOn] = useState(tabs[0].id as string);
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      let cur = tabs[0].id as string;
      for (const x of tabs) {
        const el = document.getElementById(x.id);
        if (el && el.getBoundingClientRect().top <= 120) cur = x.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = tabs[tabs.length - 1].id;
      setOn(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);
  useEffect(() => {
    row.current?.querySelector<HTMLElement>(".is-on")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [on]);
  return (
    <nav className="pf-tabs" aria-label={t("label")}>
      <div className="pf-tabs-row" ref={row}>
        {tabs.map((x) => (
          <a key={x.id} href={`#${x.id}`} className={`pf-tab${on === x.id ? " is-on" : ""}`} aria-current={on === x.id ? "true" : undefined}>
            <span className={`ph ph-${x.icon}`} aria-hidden="true" />{t(x.key)}
          </a>
        ))}
      </div>
    </nav>
  );
}
