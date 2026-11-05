import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { readEntitlement } = await import("./account");
const { billingTablesMissing, noteBillingError, resetBillingTables } = await import("./tables");

/** A Supabase client stand-in that answers every entitlement read with `answer` and counts the reads and retry settings. */
function fakeDb(answer: { data: unknown; error: { code: string; message: string } | null }) {
  const calls = { reads: 0, retry: [] as boolean[] };
  const q = {
    select: () => q, eq: () => q,
    retry: (on: boolean) => { calls.retry.push(on); return q; },
    maybeSingle: async () => { calls.reads++; return answer; },
  };
  return { db: { from: () => q } as never, calls };
}

beforeEach(() => resetBillingTables());

describe("issue #131: the plan read is one quick read that fails fast", () => {
  it("reads the row once, with retries off", async () => {
    const { db, calls } = fakeDb({ data: { plan: "pro", valid_until: "2999-01-01T00:00:00Z", pro_since: null, pro_ended_at: null, source: "live" }, error: null });
    expect((await readEntitlement(db, "u1"))?.plan).toBe("pro");
    expect(calls).toEqual({ reads: 1, retry: [false] });
  });
  it("a missing billing table answers Free and stops asking for a minute", async () => {
    const { db, calls } = fakeDb({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.entitlements' in the schema cache" } });
    expect(await readEntitlement(db, "u1")).toBeNull();
    expect(billingTablesMissing()).toBe(true);
    expect(await readEntitlement(db, "u2")).toBeNull();
    expect(calls.reads).toBe(1);
    expect(billingTablesMissing(Date.now() + 61_000)).toBe(false);
  });
  it("other errors answer Free without the quiet minute", async () => {
    const { db, calls } = fakeDb({ data: null, error: { code: "PGRST301", message: "JWT expired" } });
    expect(await readEntitlement(db, "u1")).toBeNull();
    expect(await readEntitlement(db, "u1")).toBeNull();
    expect(calls.reads).toBe(2);
    noteBillingError({ code: "42P01" });
    expect(billingTablesMissing()).toBe(true);
  });
});
