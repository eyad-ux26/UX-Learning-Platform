import { describe, expect, it } from "vitest";
import { decideReplay, replayXp } from "./replay";

const noon = new Date("2026-11-02T12:00:00Z");
describe("decideReplay", () => {
  it("a first play is not a replay", () => {
    expect(decideReplay(false, [], noon)).toBeNull();
  });
  it("the first replay of the day pays", () => {
    expect(decideReplay(true, [], noon)).toBe("paid");
  });
  it("a second replay the same day does not", () => {
    expect(decideReplay(true, ["2026-11-02T08:00:00Z"], noon)).toBe("unpaid");
  });
  it("a paid replay from yesterday does not block today", () => {
    expect(decideReplay(true, ["2026-11-01T08:00:00Z"], noon)).toBe("paid");
  });
  it("uses the learner's own day", () => {
    // 23:30 UTC on 1 Nov is already 2 Nov in Cairo (UTC+2)
    expect(decideReplay(true, ["2026-11-01T23:30:00Z"], noon, "Africa/Cairo")).toBe("unpaid");
    expect(decideReplay(true, ["2026-11-01T23:30:00Z"], noon, "UTC")).toBe("paid");
  });
});
describe("replayXp", () => {
  it("halves, rounds down, and pays nothing when unpaid", () => {
    expect([10, 5, 0].map((x) => replayXp(x, "paid"))).toEqual([5, 2, 0]);
    expect([10, 5, 0].map((x) => replayXp(x, "unpaid"))).toEqual([0, 0, 0]);
    expect([10, 5, 0].map((x) => replayXp(x, null))).toEqual([10, 5, 0]);
  });
});
