import { describe, expect, it, vi } from "vitest";

// Two clips: one used in a free Unit 1 lesson and a Pro unit, one used only in a Pro unit.
vi.mock("@uxgate/content", async (importOriginal) => {
  const real = await importOriginal<typeof import("@uxgate/content")>();
  const units: Record<string, string[]> = { "free-and-pro": ["P01-U01", "P01-U02"], "pro-only": ["P01-U02"] };
  return { ...real, videoUnits: (id: string) => units[id] ?? [] };
});

const { lessonOpen, unitOpen, videoOpen, certificateOpen } = await import("./access");
const { getUnit } = await import("@uxgate/content");

describe("what a plan opens (server gate)", () => {
  it("Unit 1 is free, later units need Pro", () => {
    expect(unitOpen(getUnit("P01-U01"), false)).toBe(true);
    expect(unitOpen(getUnit("P01-U02"), false)).toBe(false);
    expect(unitOpen(getUnit("P01-U02"), true)).toBe(true);
    expect(unitOpen(undefined, true)).toBe(false);
  });
  it("lessons follow their unit", () => {
    expect(lessonOpen("P01-U01-L01", false)).toBe(true);
    expect(lessonOpen("P01-U02-L01", false)).toBe(false);
    expect(lessonOpen("P01-U02-L01", true)).toBe(true);
    expect(lessonOpen("nope", true)).toBe(false);
  });
  it("a Pro unit's re-test bank (the mastery round) needs Pro, so /api/attempts refuses it (#137)", () => {
    expect(lessonOpen("P01-U01-B01", false)).toBe(true);
    expect(lessonOpen("P01-U02-B01", false)).toBe(false);
    expect(lessonOpen("P01-U02-B01", true)).toBe(true);
  });
  it("a clip is open when any unit that uses it is open (#137)", () => {
    expect(videoOpen("free-and-pro", false)).toBe(true);
    expect(videoOpen("pro-only", false)).toBe(false);
    expect(videoOpen("pro-only", true)).toBe(true);
    expect(videoOpen("unknown", true)).toBe(false);
  });
  it("certificates need Pro", () => {
    expect(certificateOpen(false)).toBe(false);
    expect(certificateOpen(true)).toBe(true);
  });
});
