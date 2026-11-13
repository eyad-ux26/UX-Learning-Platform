"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { billingPost } from "./api";

/** Opens from the emailed link. The check runs from the page (a POST), so mail scanners that only fetch the link don't use it up. */
export function StudentConfirm({ token, until }: { token: string | null; until: string }) {
  const t = useTranslations("billing");
  const [state, setState] = useState<"busy" | "done" | "expired">(token ? "busy" : "expired");
  const once = useRef(false);
  useEffect(() => {
    if (!token || once.current) return;
    once.current = true;
    billingPost("student", { action: "confirm", token }).then((r) => setState(r.ok ? "done" : "expired"));
  }, [token]);
  return (
    <main className="bye" role="status" aria-live="polite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state === "expired" ? "/ill/uxgate-ill-error.png" : "/ill/uxgate-ill-key.png"}
        alt=""
        width={120}
        height={120}
      />
      {state === "busy" ? (
        <span className="spin" style={{ color: "var(--link)", inlineSize: 28, blockSize: 28 }} aria-hidden="true" />
      ) : null}
      <h1>{state === "done" ? t("stDone") : state === "expired" ? t("stExpired") : t("stTitle")}</h1>
      {state === "done" ? <p>{t("stDoneBody", { date: until })}</p> : null}
      {state !== "busy" ? (
        <Link href="/app/plans" className="btn btn-primary btn-lg press" style={{ minInlineSize: 240 }}>
          {t("seePlans")}
        </Link>
      ) : null}
    </main>
  );
}
