import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("launchConfirmEmail", () => {
  it("carries the confirmation link as a button and as copyable text, in both languages", async () => {
    const { launchConfirmEmail } = await import("./launch");
    const href = "https://uxgate.org/ar/coming-soon/confirm?t=abc_DEF-123";
    for (const locale of ["en", "ar"] as const) {
      const m = launchConfirmEmail({ locale, href });
      expect(m.subject).toMatch(/UXGate/);
      expect(m.html).toContain(href);
      expect(m.text).toContain(href);
      expect(m.text).toMatch(/7/);
    }
    expect(launchConfirmEmail({ locale: "ar", href }).html).toContain('dir="rtl"');
  });
});
