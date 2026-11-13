"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { play } from "@/lib/sound";
import { joinLeaderboard, leaveLeaderboard } from "@/app/[locale]/app/(shell)/profile/share-actions";

export function BoardJoin({ defaultName }: { defaultName: string }) {
  const t = useTranslations("board");
  const router = useRouter();
  const [name, setName] = useState(defaultName.slice(0, 30));
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <img src="/ill/uxgate-ill-trophy.png" alt="" style={{ inlineSize: 88, blockSize: 88, alignSelf: "center" }} />
      <h2 className="t-h2">{t("offTitle")}</h2>
      <p className="t-small ink-2">{t("offBody")}</p>
      <div className="field">
        <label htmlFor="bd-name">{t("name")}</label>
        <div className="input">
          <input id="bd-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-lg press"
        disabled={pending || !name.trim()}
        aria-busy={pending || undefined}
        onClick={() =>
          start(async () => {
            setFailed(false);
            const r = await joinLeaderboard({ name });
            if (!r.ok) {
              setFailed(true);
              return;
            }
            play("ui-toggle-on");
            router.refresh();
          })
        }
      >
        {t("join")}
      </button>
      {failed ? (
        <p className="ob-err" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </section>
  );
}

export function BoardLeave() {
  const t = useTranslations("board");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        className="btn btn-secondary press"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          start(async () => {
            setFailed(false);
            const r = await leaveLeaderboard();
            if (!r.ok) {
              setFailed(true);
              return;
            }
            router.refresh();
          })
        }
      >
        {t("leave")}
      </button>
      <p className="t-small ink-2">{t("leaveNote")}</p>
      {failed ? (
        <p className="ob-err" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </section>
  );
}
