import { Link } from "@/i18n/navigation";

/** Page title with a Back link on a phone (the rail does the job on a laptop), and optional actions at the end. */
export function PageTop({ title, back, backLabel, children }: { title: string; back?: string; backLabel: string; children?: React.ReactNode }) {
  return (
    <header className="pg-top" style={{ gap: 4 }}>
      {back ? <Link href={back} className="icon-btn plain only-mobile" aria-label={backLabel}><span className="ph ph-arrow back" aria-hidden="true" /></Link> : null}
      <h1 className="pg-title" style={{ flex: 1 }}>{title}</h1>
      {children}
    </header>
  );
}
