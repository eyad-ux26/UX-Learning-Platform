"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SystemView, sysBtn } from "@/components/public/SystemView";

/** A short reference to send to support: the server's error digest when there is one, otherwise a random one made here. */
function shortRef(digest?: string) {
  if (digest) return digest.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const r = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => a[b % a.length]).join("");
  return `${r.slice(0, 4)}-${r.slice(4)}`;
}

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("sys");
  // Set after mount so a random reference never differs between the server and the browser.
  const [ref, setRef] = useState(error.digest ? shortRef(error.digest) : "");
  useEffect(() => {
    if (!error.digest) setRef(shortRef());
    console.error(error);
  }, [error]);
  return (
    <SystemView ill="error" code={t("errCode", { ref: ref || "…" })} title={t("errTitle")} body={t("errBody")} safe={t("errSafe")} foot={t("errFoot")}>
      <button type="button" className={sysBtn(true)} onClick={() => reset()}><span className="ph ph-sync" aria-hidden="true" />{t("retry")}</button>
      <Link href="/" className={sysBtn(false)}><span className="ph ph-house" aria-hidden="true" />{t("home")}</Link>
    </SystemView>
  );
}
