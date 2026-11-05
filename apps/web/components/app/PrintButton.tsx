"use client";

export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="btn btn-secondary btn-lg no-print" onClick={() => window.print()}><span className="ph ph-download" aria-hidden="true" />{label}</button>;
}
