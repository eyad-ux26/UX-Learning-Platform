import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sendEmail = vi.fn();
vi.mock("@/lib/server/email/send", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

function fakeDb(queued: { id: string; email: string; locale: string }[], markOk = true) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    calls.push({ fn, args });
    if (fn === "waitlist_queued") return { data: queued, error: null };
    if (fn === "waitlist_mark_sent") return { data: markOk, error: null };
    return { data: null, error: null };
  };
  return { db: { rpc } as never, calls };
}

afterEach(() => { delete process.env.RESEND_API_KEY; sendEmail.mockReset(); });

describe("sendQueuedConfirmations", () => {
  it("does nothing until email is set up", async () => {
    const { sendQueuedConfirmations } = await import("./waitlist-mail");
    const { db, calls } = fakeDb([{ id: "1", email: "a@example.com", locale: "en" }]);
    expect(await sendQueuedConfirmations(db)).toEqual({ sent: 0, failed: 0 });
    expect(calls).toEqual([]);
  });
  it("sends each queued address its link in its language, and re-queues a failed one", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const { sendQueuedConfirmations } = await import("./waitlist-mail");
    sendEmail.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, error: "x" });
    const { db, calls } = fakeDb([{ id: "1", email: "a@example.com", locale: "ar" }, { id: "2", email: "b@example.com", locale: "en" }]);
    expect(await sendQueuedConfirmations(db)).toEqual({ sent: 1, failed: 1 });
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: "a@example.com", kind: "launch-confirm", locale: "ar" });
    expect(sendEmail.mock.calls[0][0].text).toMatch(/\/ar\/coming-soon\/confirm\?t=[A-Za-z0-9_-]{43}/);
    expect(calls.filter((c) => c.fn === "waitlist_send_failed")).toHaveLength(1);
  });
  it("skips an address confirmed or sent meanwhile", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const { sendQueuedConfirmations } = await import("./waitlist-mail");
    const { db } = fakeDb([{ id: "1", email: "a@example.com", locale: "en" }], false);
    expect(await sendQueuedConfirmations(db)).toEqual({ sent: 0, failed: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
