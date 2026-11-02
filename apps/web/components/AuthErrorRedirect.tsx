"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/** Some providers put the failure in the address hash (#error=...), which only the browser can see. Send the learner to sign-in, which explains it. */
export function AuthErrorRedirect() {
  const locale = useLocale();
  useEffect(() => {
    if (/[#&]error(_description|_code)?=/.test(window.location.hash)) window.location.replace(`/${locale}/signin?error=link`);
  }, [locale]);
  return null;
}
