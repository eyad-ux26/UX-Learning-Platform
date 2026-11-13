import { describe, expect, it } from "vitest";
import en from "../messages/en/account.json";
import ar from "../messages/ar/account.json";
import { inboxCopy, safeHref, shortAgo } from "./inbox";

describe("inbox items", () => {
  it("every kind has its title, body and where-it-opens copy in both languages", () => {
    for (const kind of ["reminder", "goal", "review", "badge", "answer", "billing", "welcome"] as const) {
      for (const data of [
        {},
        { lesson: { en: "L", ar: "د" }, name: { en: "B", ar: "ش" }, status: "accepted" as const, cert: false },
      ]) {
        const c = inboxCopy(kind, data);
        for (const k of [c.title, c.body, c.go]) {
          expect(en.inbox, `${kind} ${k}`).toHaveProperty(k);
          expect(ar.inbox, `${kind} ${k}`).toHaveProperty(k);
        }
      }
    }
  });
  it("names come in the learner's language", () => {
    expect(inboxCopy("badge", { name: { en: "Cut fields", ar: "احذف الحقول" } }, "ar").values.name).toBe("احذف الحقول");
  });
  it("only opens paths inside the app", () => {
    expect(safeHref("/app/lesson/P01-U01-L01")).toBe("/app/lesson/P01-U01-L01");
    expect(safeHref("//evil.example")).toBe("/app");
    expect(safeHref("https://evil.example")).toBe("/app");
    expect(safeHref(null)).toBe("/app");
  });
  it("short times", () => {
    const now = new Date("2026-11-05T12:00:00Z");
    expect(shortAgo("2026-11-05T11:59:40Z", now, "en").key).toBe("now");
    expect(shortAgo("2026-11-05T10:00:00Z", now, "en")).toEqual({ key: "hAgo", count: 2 });
    expect(shortAgo("2026-11-04T10:00:00Z", now, "en").key).toBe("yesterday");
    expect(shortAgo("2026-11-01T10:00:00Z", now, "en").text).toBe("1 Nov");
  });
});
