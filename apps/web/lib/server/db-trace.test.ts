import { afterEach, describe, expect, it, vi } from "vitest";
import { labelOf, serverTiming, traceLine, tracedFetch, withTrace } from "./db-trace";

afterEach(() => vi.unstubAllGlobals());

describe("db-trace", () => {
  it("names a call by table, function or auth endpoint, never by its query", () => {
    expect(labelOf("https://x.supabase.co/rest/v1/profiles?select=*&user_id=eq.1")).toBe("rest:profiles");
    expect(labelOf("https://x.supabase.co/rest/v1/rpc/my_learner_state?p_since=2026-07-01")).toBe(
      "rpc:my_learner_state",
    );
    expect(labelOf("https://x.supabase.co/auth/v1/user")).toBe("auth:user");
  });
  it("records every call made inside a trace, even from nested async work", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const { trace, result } = withTrace(async () => {
      await Promise.all([
        tracedFetch("https://x.supabase.co/rest/v1/a"),
        (async () => {
          await new Promise((r) => setTimeout(r, 5));
          await tracedFetch("https://x.supabase.co/rest/v1/b");
        })(),
      ]);
    });
    await result;
    expect(trace.calls.map((c) => c.label).sort()).toEqual(["rest:a", "rest:b"]);
    expect(await withTrace(async () => 1).result).toBe(1);
  });
  it("never repeats a write, and repeats a failed read only once", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", f);
    const { trace, result } = withTrace(async () => {
      await tracedFetch("https://x.supabase.co/rest/v1/a", { method: "POST", body: "{}" });
      await tracedFetch("https://x.supabase.co/rest/v1/a");
    });
    await result;
    expect(f).toHaveBeenCalledTimes(3);
    expect(trace.calls).toMatchObject([
      { method: "POST", status: 503, retried: false },
      { method: "GET", status: 503, retried: true },
    ]);
  });
  it("puts totals in the Server-Timing header and the details in the log line", () => {
    const trace = {
      calls: [
        { label: "rpc:my_learner_state", method: "GET", status: 200, ms: 40, retried: false },
        { label: "rest:attempts", method: "GET", status: 0, ms: 10, retried: true },
      ],
    };
    expect(serverTiming(trace, 120)).toBe('app;dur=120, db;dur=50;desc="2 calls", dbmax;dur=40');
    expect(traceLine("GET", "/en/app", 200, 120, trace)).toBe(
      "db GET /en/app 200 120ms 2 calls: rpc:my_learner_state 40ms, rest:attempts 10ms [0] [retried]",
    );
  });
});
