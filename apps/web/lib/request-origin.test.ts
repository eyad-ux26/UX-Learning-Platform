import { describe, expect, it } from "vitest";
import { originFromHost } from "./request-origin";

describe("originFromHost", () => {
  it("uses https for real hosts", () => {
    expect(originFromHost("uxgate.org")).toBe("https://uxgate.org");
    expect(originFromHost("UXGate.org.")).toBe("https://uxgate.org");
    expect(originFromHost("abc-uxgate-web.uxgate-web.workers.dev")).toBe(
      "https://abc-uxgate-web.uxgate-web.workers.dev",
    );
  });
  it("uses http only for a local dev server", () => {
    expect(originFromHost("localhost:3000")).toBe("http://localhost:3000");
    expect(originFromHost("127.0.0.1:3100")).toBe("http://127.0.0.1:3100");
  });
  it("falls back for a missing or malformed host", () => {
    expect(originFromHost(null)).toBe("https://uxgate.org");
    expect(originFromHost("")).toBe("https://uxgate.org");
    expect(originFromHost("evil.com/@x")).toBe("https://uxgate.org");
    expect(originFromHost("a b")).toBe("https://uxgate.org");
  });
});
