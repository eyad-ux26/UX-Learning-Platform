import { describe, expect, it } from "vitest";
import { withinMemoryLimit } from "./rate-limit";

describe("withinMemoryLimit", () => {
  it("lets `limit` hits through per window, then blocks, then resets", () => {
    const k = "t:" + Math.random();
    for (let i = 0; i < 3; i++) expect(withinMemoryLimit(k, 3, 1000, 5000)).toBe(true);
    expect(withinMemoryLimit(k, 3, 1000, 5500)).toBe(false);
    expect(withinMemoryLimit(k, 3, 1000, 6100)).toBe(true);
  });
  it("counts each key on its own", () => {
    expect(withinMemoryLimit("a:" + 1, 1, 1000, 1)).toBe(true);
    expect(withinMemoryLimit("b:" + 1, 1, 1000, 1)).toBe(true);
  });
});
