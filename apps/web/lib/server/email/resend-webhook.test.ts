import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const upsert = vi.fn<(rows: unknown, opts: unknown) => Promise<{ error: null | { code: string; message: string } }>>(async () => ({ error: null }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({ upsert }) }) }));

import { signResend, verifyResend } from "./resend-webhook";
import { POST } from "@/app/api/webhooks/resend/route";

const SECRET = `whsec_${btoa("a test signing secret, 24+ bytes")}`;
const now = new Date("2026-11-12T12:00:00Z");
const ts = String(Math.floor(now.getTime() / 1000));
const bounce = JSON.stringify({ type: "email.bounced", created_at: now.toISOString(), data: { email_id: "re_1", to: ["New@Example.com"], bounce: { type: "Permanent", message: "Mailbox does not exist" } } });
const headers = async (body: string, id = "msg_1", t = ts) => ({ id, timestamp: t, signature: `v1,${await signResend(SECRET, id, t, body)}` });

describe("Resend webhook signature (Svix)", () => {
  it("matches the Svix documentation's example", async () => {
    expect(await signResend("whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw", "msg_p5jXN8AQM9LWM0D4loKWxJek", "1614265330", '{"test": 2432232314}'))
      .toBe("g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=");
  });
  it("accepts a correctly signed event and reads the address and reason", async () => {
    const v = await verifyResend(bounce, await headers(bounce), SECRET, now);
    expect(v).toEqual({ ok: true, event: { id: "msg_1", type: "email.bounced", emailId: "re_1", to: ["new@example.com"], detail: "Permanent: Mailbox does not exist" } });
  });
  it("accepts any one of several signatures (secret rotation)", async () => {
    const h = await headers(bounce);
    expect((await verifyResend(bounce, { ...h, signature: `v1,AAAA ${h.signature}` }, SECRET, now)).ok).toBe(true);
  });
  it("refuses a changed body, a wrong secret, an old timestamp and missing headers", async () => {
    const h = await headers(bounce);
    expect(await verifyResend(bounce.replace("New@", "Old@"), h, SECRET, now)).toEqual({ ok: false, reason: "signature" });
    expect(await verifyResend(bounce, h, `whsec_${btoa("another secret of enough length")}`, now)).toEqual({ ok: false, reason: "signature" });
    const old = String(Number(ts) - 600);
    expect(await verifyResend(bounce, await headers(bounce, "msg_1", old), SECRET, now)).toEqual({ ok: false, reason: "signature" });
    expect(await verifyResend(bounce, { ...h, signature: null }, SECRET, now)).toEqual({ ok: false, reason: "signature" });
  });
});

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => { vi.useFakeTimers({ now, toFake: ["Date"] }); process.env.RESEND_WEBHOOK_SECRET = SECRET; upsert.mockClear(); });
  afterEach(() => { vi.useRealTimers(); delete process.env.RESEND_WEBHOOK_SECRET; });
  const post = async (body: string, h?: { id: string; timestamp: string; signature: string }) => {
    const s = h ?? (await headers(body));
    return POST(new Request("https://uxgate.org/api/webhooks/resend", { method: "POST", body, headers: { "svix-id": s.id, "svix-timestamp": s.timestamp, "svix-signature": s.signature } }));
  };

  it("records a bounce once per event and address", async () => {
    const r = await post(bounce);
    expect(r.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith([{ email: "new@example.com", kind: "bounced", detail: "Permanent: Mailbox does not exist", resend_id: "re_1", event_id: "msg_1" }], { onConflict: "event_id,email", ignoreDuplicates: true });
  });
  it("records suppressed addresses and ignores other event types", async () => {
    const sup = JSON.stringify({ type: "email.suppressed", data: { email_id: "re_2", to: ["a@b.co"] } });
    expect((await post(sup)).status).toBe(200);
    expect(upsert.mock.calls[0]![0]).toMatchObject([{ email: "a@b.co", kind: "suppressed" }]);
    upsert.mockClear();
    const delivered = JSON.stringify({ type: "email.delivered", data: { email_id: "re_3", to: ["a@b.co"] } });
    expect(await (await post(delivered)).json()).toEqual({ ok: true, ignored: "email.delivered" });
    expect(upsert).not.toHaveBeenCalled();
  });
  it("answers 401 to an unsigned call and 503 before the secret is set", async () => {
    expect((await post(bounce, { id: "x", timestamp: ts, signature: "v1,bad" })).status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
    delete process.env.RESEND_WEBHOOK_SECRET;
    expect((await post(bounce)).status).toBe(503);
  });
  it("answers 500 when the row cannot be stored, so Resend tries again", async () => {
    upsert.mockResolvedValueOnce({ error: { code: "42P01", message: "relation does not exist" } });
    expect((await post(bounce)).status).toBe(500);
  });
});
