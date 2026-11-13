// Issue #184: what each request asks Supabase, and how long it waits. Every server Supabase client sends its HTTP calls
// through tracedFetch. The Worker entry (cf-worker.ts) opens a trace per request, then adds a Server-Timing header and
// one log line (visible in `wrangler tail` and Workers logs) with the number of calls and the time they took.
// Outside a trace (next dev, tests that do not open one) tracedFetch only applies the retry rule below.
//
// Retries: supabase-js retries a failed read after 1 s, 2 s and 4 s. On a page that is seconds of blank screen, so the
// server clients turn that off and tracedFetch tries a failed read once more after a short pause instead. Writes are
// never repeated here.
import { AsyncLocalStorage } from "node:async_hooks";

export type DbCall = { label: string; method: string; status: number; ms: number; retried: boolean };
export type Trace = { calls: DbCall[] };

// One store for the whole isolate. cf-worker.ts and the Next.js server bundle each get their own copy of this module,
// so the store lives on globalThis under a shared key, and both copies see the same trace.
const KEY = Symbol.for("uxgate.dbTrace");
type Holder = { [KEY]?: AsyncLocalStorage<Trace> };
const store = (): AsyncLocalStorage<Trace> => ((globalThis as Holder)[KEY] ??= new AsyncLocalStorage<Trace>());

/** Runs fn with a fresh trace; every Supabase call made inside it, at any depth, is recorded there. */
export function withTrace<T>(fn: () => T): { trace: Trace; result: T } {
  const trace: Trace = { calls: [] };
  return { trace, result: store().run(trace, fn) };
}

export const currentTrace = (): Trace | undefined => store().getStore();

/** A short name for a Supabase URL: "rest:profiles", "rpc:my_learner_state", "auth:user". Never the query string. */
export function labelOf(url: string): string {
  const path = new URL(url).pathname;
  const m = /\/(rest|auth|storage|functions)\/v1\/(.*)$/.exec(path);
  if (!m) return path;
  const rest = m[2];
  if (m[1] === "rest") return rest.startsWith("rpc/") ? `rpc:${rest.slice(4)}` : `rest:${rest}`;
  return `${m[1]}:${rest}`;
}

const RETRY_STATUS = new Set([503, 520]);
export const RETRY_PAUSE_MS = 150;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch for the server Supabase clients: records the call in the current trace and retries a failed read once, quickly. */
export async function tracedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (
    init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")
  ).toUpperCase();
  const canRetry = method === "GET" || method === "HEAD";
  const trace = currentTrace();
  const t0 = Date.now();
  let retried = false;
  const record = (status: number) =>
    trace?.calls.push({ label: labelOf(url), method, status, ms: Date.now() - t0, retried });
  for (;;) {
    try {
      const res = await fetch(input, init);
      if (canRetry && !retried && RETRY_STATUS.has(res.status)) {
        await res.body?.cancel();
        retried = true;
        await sleep(RETRY_PAUSE_MS);
        continue;
      }
      record(res.status);
      return res;
    } catch (e) {
      if (canRetry && !retried && !(e instanceof Error && e.name === "AbortError")) {
        retried = true;
        await sleep(RETRY_PAUSE_MS);
        continue;
      }
      record(0);
      throw e;
    }
  }
}

/** Server-Timing value: total database wait and number of calls. Table names stay in the log, not in the header. */
export function serverTiming(trace: Trace, totalMs: number): string {
  const db = trace.calls.reduce((s, c) => s + c.ms, 0);
  const slowest = trace.calls.reduce((m, c) => Math.max(m, c.ms), 0);
  return `app;dur=${totalMs}, db;dur=${db};desc="${trace.calls.length} calls", dbmax;dur=${slowest}`;
}

/** One log line per request: "db GET /en/app 412ms 1 call: rpc:my_learner_state 180ms". Retries and errors are marked. */
export function traceLine(method: string, path: string, status: number, totalMs: number, trace: Trace): string {
  const calls = trace.calls.map(
    (c) =>
      `${c.label} ${c.ms}ms${c.status >= 400 || c.status === 0 ? ` [${c.status}]` : ""}${c.retried ? " [retried]" : ""}`,
  );
  return `db ${method} ${path} ${status} ${totalMs}ms ${trace.calls.length} call${trace.calls.length === 1 ? "" : "s"}${calls.length ? `: ${calls.join(", ")}` : ""}`;
}
