// Reading admin form fields. Every value is checked on the server; a bad one is an AdminError the form shows.
import { z } from "zod";
import { AdminError } from "./guard";
import { reasonOf } from "./rules";

export function reasonFrom(f: FormData, name = "reason"): string {
  const r = reasonOf(f.get(name));
  if (!r) throw new AdminError("invalid", "Write a reason of at least 3 characters.");
  return r;
}

export function uuidFrom(v: unknown): string {
  const p = z.string().uuid().safeParse(v);
  if (!p.success) throw new AdminError("invalid", "Something is missing. Reload the page and try again.");
  return p.data;
}

/** A trimmed text field, or null when empty. Longer than `max` is refused. */
export function textFrom(f: FormData, name: string, max = 2000, required = false, what = "this field"): string | null {
  const v = String(f.get(name) ?? "").trim();
  if (!v) {
    if (required) throw new AdminError("invalid", `Fill in ${what}.`);
    return null;
  }
  if (v.length > max) throw new AdminError("invalid", `Keep ${what} under ${max} characters.`);
  return v;
}

export function intFrom(f: FormData, name: string, min: number, max: number, what = "the number"): number | null {
  const raw = String(f.get(name) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new AdminError("invalid", `Enter ${what} between ${min} and ${max}.`);
  return n;
}

/** A yyyy-mm-dd date field as the end of that day in Cairo winter time (+02:00; in summer it ends an hour early). */
export function dateFrom(f: FormData, name: string): Date | null {
  const raw = String(f.get(name) ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new AdminError("invalid", "Pick a date.");
  const d = new Date(`${raw}T23:59:00+02:00`);
  if (Number.isNaN(d.getTime())) throw new AdminError("invalid", "Pick a date.");
  return d;
}
