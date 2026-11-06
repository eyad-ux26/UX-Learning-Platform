import { beforeEach, describe, expect, it } from "vitest";
import { markTourSeen, resetTours, tourKind } from "./lesson-tour";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage;
});

const base = { guest: false, userId: "u1", atStart: true };

describe("lesson tour kind", () => {
  it("shows on the first lesson only, once", () => {
    expect(tourKind({ ...base, firstLesson: true })).toBe("first");
    markTourSeen("first", "u1");
    expect(tourKind({ ...base, firstLesson: true })).toBeUndefined();
  });
  it("stays away for a learner with finished lessons", () => {
    expect(tourKind({ ...base, firstLesson: false })).toBeUndefined();
  });
  it("shows again after Settings asks for a replay, on any lesson, even a resumed one", () => {
    markTourSeen("first", "u1");
    resetTours("u1");
    expect(tourKind({ ...base, firstLesson: false, atStart: false })).toBe("first");
  });
  it("a replay ends once the tour is finished or skipped", () => {
    resetTours("u1");
    markTourSeen("first", "u1");
    expect(tourKind({ ...base, firstLesson: false })).toBeUndefined();
  });
  it("shows to a guest once", () => {
    expect(tourKind({ ...base, guest: true, firstLesson: false })).toBe("guest");
    markTourSeen("guest", "u1");
    expect(tourKind({ ...base, guest: true, firstLesson: false })).toBeUndefined();
  });
});
