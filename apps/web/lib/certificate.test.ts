import { describe, expect, it } from "vitest";
import type { ContentIndex as Bundle } from "@uxgate/content";
import { certificateEarned, handleBase, HANDLE_RE, pathProgressCounts, totalsAcross } from "./certificate";

const b = {
  cast: [],
  paths: [],
  lessons: [],
  units: [
    {
      id: "P01-U01",
      pathId: "P01",
      title: { en: "", ar: "" },
      skill: { en: "", ar: "" },
      free: true,
      lessons: [],
      skills: [
        { id: "S1", title: { en: "", ar: "" }, can_do: { en: "", ar: "" } },
        { id: "S2", title: { en: "", ar: "" }, can_do: { en: "", ar: "" } },
      ],
    },
    {
      id: "P01-U02",
      pathId: "P01",
      title: { en: "", ar: "" },
      skill: { en: "", ar: "" },
      free: false,
      lessons: [],
      skills: [{ id: "S3", title: { en: "", ar: "" }, can_do: { en: "", ar: "" } }],
    },
    {
      id: "P10-U01",
      pathId: "P10",
      title: { en: "", ar: "" },
      skill: { en: "", ar: "" },
      free: true,
      lessons: [],
      skills: [{ id: "T1", title: { en: "", ar: "" }, can_do: { en: "", ar: "" } }],
    },
  ],
} as unknown as Bundle;
const states = (m: Record<string, "practiced" | "shown" | "kept">) => (id: string) => m[id];

describe("certificate", () => {
  it("appears only when every skill of the path is Shown or Kept", () => {
    expect(certificateEarned("P01", states({ S1: "shown", S2: "kept", S3: "shown" }), b)).toBe(true);
    expect(certificateEarned("P01", states({ S1: "shown", S2: "kept", S3: "practiced" }), b)).toBe(false);
    expect(certificateEarned("P01", states({ S1: "shown", S2: "shown" }), b)).toBe(false);
  });
  it("a path with no skills never earns one", () => {
    expect(certificateEarned("P99", states({}), b)).toBe(false);
  });
  it("counts Shown (which includes Kept) and Kept", () => {
    expect(pathProgressCounts("P01", states({ S1: "shown", S2: "kept", S3: "practiced" }), b)).toEqual({
      total: 3,
      shown: 2,
      kept: 1,
    });
  });
  it("Profile totals count only the paths it shows: a skill from an unjoined path is left out", () => {
    const st = states({ S1: "shown", S2: "kept", T1: "kept" });
    expect(totalsAcross(["P01"], st, b)).toEqual({ shown: 2, kept: 1 });
    expect(totalsAcross(["P01", "P10"], st, b)).toEqual({ shown: 3, kept: 2 });
    expect(totalsAcross(["P01", "P01"], st, b)).toEqual({ shown: 2, kept: 1 });
  });
});

describe("handles", () => {
  it("makes a safe slug from any name", () => {
    expect(handleBase("Yasmin Ali")).toBe("yasmin-ali");
    expect(handleBase("  ../Évil/  ")).toBe("evil");
    expect(handleBase("ياسمين")).toBe("learner");
    expect(HANDLE_RE.test(handleBase("x".repeat(80)))).toBe(true);
  });
});
