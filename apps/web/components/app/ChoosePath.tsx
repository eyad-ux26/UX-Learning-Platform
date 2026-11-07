"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { play } from "@/lib/sound";
import { chooseCurrentPath } from "@/app/[locale]/app/(shell)/paths/actions";

/** Start or continue a path: joins it if needed, makes it current, then goes to where the learner asked. */
export function ChoosePath({ pathId, label, to, className = "btn btn-primary btn-lg btn-block press", icon = "play" }: { pathId: string; label: string; to: string; className?: string; icon?: string }) {
  const t = useTranslations("paths");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const go = () => start(async () => {
    setFailed(false);
    const res = await chooseCurrentPath({ pathId });
    if (!res.ok) { setFailed(true); return; }
    play("ui-tap");
    router.push(to);
    router.refresh();
  });
  return (
    <>
      <button type="button" className={className} onClick={go} disabled={pending} aria-busy={pending || undefined}><span className={`ph ph-${icon}`} aria-hidden="true" />{label}</button>
      {failed ? <p className="ob-err" role="alert">{t("failed")}</p> : null}
    </>
  );
}
