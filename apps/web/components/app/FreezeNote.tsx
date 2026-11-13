"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { dismissFreezeNote } from "@/app/[locale]/app/(shell)/streak/actions";

/** A calm note, shown once, after a freeze covered a missed day. No sound, no loss wording. */
export function FreezeNote({ id, streak }: { id: string; streak: number }) {
  const t = useTranslations("home");
  const [gone, setGone] = useState(false);
  const [, start] = useTransition();
  if (gone) return null;
  return (
    <section className="card freeze-note" role="status">
      <img src="/ill/uxgate-ill-shield.png" alt="" style={{ inlineSize: 44, blockSize: 44, flex: "none" }} />
      <div style={{ flex: 1, minInlineSize: 0 }}>
        <p className="t-label">{t("freezeTitle")}</p>
        <p className="t-small ink-2">{t("freezeBody", { count: streak })}</p>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          setGone(true);
          start(async () => {
            await dismissFreezeNote({ id });
          });
        }}
      >
        {t("dismiss")}
      </button>
    </section>
  );
}
