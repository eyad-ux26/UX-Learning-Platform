import { describe, expect, it } from "vitest";
import { LEGAL, LEGAL_STATUS } from "./legal-text";

describe("legal text", () => {
  it("English and Arabic have the same sections, each with text", () => {
    for (const kind of ["privacy", "terms"] as const) {
      const en = LEGAL[kind].en.sections, ar = LEGAL[kind].ar.sections;
      expect(ar.length).toBe(en.length);
      en.forEach((s, i) => {
        expect(!!ar[i].list).toBe(!!s.list);
        expect(!!ar[i].key).toBe(!!s.key);
        expect(s.ps.length + (s.list?.length ?? 0) + (s.key ? 1 : 0)).toBeGreaterThan(0);
      });
    }
  });
  it("stays marked as a sample until the admins approve it", () => {
    if (!LEGAL_STATUS.approved) expect(LEGAL_STATUS.updated).toBe("[DATE]");
  });
});
