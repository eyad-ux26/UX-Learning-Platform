"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { signOut } from "@/app/[locale]/app/(shell)/profile/actions";

/** "Sign out" on the Coming Soon page for a signed-in member who is not an admin. */
export function SoonSignOut({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-secondary press" style={{ alignSelf: "flex-start" }} disabled={pending} aria-busy={pending || undefined}
      onClick={() => start(async () => { await signOut(); router.push("/"); router.refresh(); })}>
      <span className="ph ph-signout" aria-hidden="true" />{label}
    </button>
  );
}
