import { afterEach, describe, expect, it, vi } from "vitest";

// An in-memory queue in place of IndexedDB.
const queue = new Map<string, unknown>();
vi.mock("./idb", () => ({
  queueAll: async () => [...queue.values()],
  queueDel: async (key: string) => { queue.delete(key); },
}));

const item = (n: number) => ({
  key: `a@1:s${n}:1:try`, userId: "u1", attemptId: "a@1", queuedAt: n,
  event: { lessonId: "L", hash: "h", stepId: `s${n}`, tryNo: 1, kind: "try", answer: {}, hintsUsed: 0, confidence: null, clientTs: n },
});
const settle = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => { queue.clear(); vi.unstubAllGlobals(); });

describe("sync flush", () => {
  it("sends an answer queued while a send is in flight, without waiting for a retry (#113)", async () => {
    const { setSyncUser, kick } = await import("./sync");
    let release!: () => void;
    const bodies: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      bodies.push(init.body);
      if (bodies.length === 1) await new Promise<void>((r) => { release = r; }); // the first POST is slow
      return { ok: true, status: 200 } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    queue.set(item(1).key, item(1));
    setSyncUser("u1"); // starts a flush; its POST hangs
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    queue.set(item(2).key, item(2)); // the lesson's last answer arrives mid-send
    kick();
    release();
    for (let i = 0; i < 10 && queue.size; i++) await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodies[1]).toContain('"stepId":"s2"');
    expect(queue.size).toBe(0);
  });

  it("a review session's answers go out marked as a review, with the session's plan", async () => {
    const { setSyncUser, kick } = await import("./sync");
    const bodies: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: string }) => { bodies.push(init.body); return { ok: true, status: 200 } as Response; }));
    const r = { ...item(3), attemptId: "b@2", key: "b@2:s3:1:try", plan: ["s3"], purpose: "review" };
    queue.set(r.key, r);
    setSyncUser("u2"); setSyncUser("u1"); kick();
    for (let i = 0; i < 10 && queue.size; i++) await settle();
    const sent = JSON.parse(bodies.at(-1)!);
    expect(sent).toMatchObject({ attemptId: "b@2", plan: ["s3"], purpose: "review" });
  });
});
