"use client";

import { Link } from "@/i18n/navigation";

/** Same as PageTop, for client views. */
export function PageTopClient({
  title,
  back,
  backLabel,
  children,
}: {
  title: string;
  back?: string;
  backLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="pg-top" style={{ gap: 4 }}>
      {back ? (
        <Link href={back} className="icon-btn plain only-mobile" aria-label={backLabel}>
          <span className="ph ph-arrow back" aria-hidden="true" />
        </Link>
      ) : null}
      <h1 className="pg-title" style={{ flex: 1 }}>
        {title}
      </h1>
      {children}
    </header>
  );
}
