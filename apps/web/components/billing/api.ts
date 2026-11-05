"use client";

/** Calls one of the billing API routes. Answers { ok: false, error } for any failure, never throws. */
export async function billingPost<T = Record<string, unknown>>(path: string, body: unknown): Promise<({ ok: true } & T) | { ok: false; error: string; [k: string]: unknown }> {
  try {
    const res = await fetch(`/api/billing/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || json.ok === false) return { ok: false, ...json, error: String(json.error ?? res.status) };
    return { ...(json as T), ok: true };
  } catch {
    return { ok: false, error: "network" };
  }
}
