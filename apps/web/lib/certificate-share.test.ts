import { describe, expect, it } from "vitest";
import { certId, linkedInFeedUrl, linkedInOffsiteUrl, linkedInProfileUrl, ogUrl, postText, publicUrl } from "./certificate-share";

describe("certificate sharing links", () => {
  const url = publicUrl("https://uxgate.org", "en", "7k3q9a1b2c3d");
  it("builds the public url, id and versioned og image", () => {
    expect(url).toBe("https://uxgate.org/en/c/7k3q9a1b2c3d");
    expect(certId("P01", "7k3q9a1b2c3d")).toBe("UXG-P01-7K3Q9A");
    expect(ogUrl("https://uxgate.org", "ar", "abc", "2026-11-02T10:00:00Z")).toBe("https://uxgate.org/ar/c/abc/og.png?v=1793613600000");
  });
  it("puts the link in the post and encodes the LinkedIn composer link", () => {
    const text = postText({ intro: "I earned it.", seeIt: "See it here:", tags: "#UX #UXGate" }, url);
    expect(text).toBe(`I earned it.\n\nSee it here: ${url}\n\n#UX #UXGate`);
    const feed = new URL(linkedInFeedUrl(text));
    expect(feed.origin + feed.pathname).toBe("https://www.linkedin.com/feed/");
    expect(feed.searchParams.get("shareActive")).toBe("true");
    expect(feed.searchParams.get("text")).toBe(text);
  });
  it("builds the share-offsite and add-to-profile links", () => {
    expect(linkedInOffsiteUrl(url)).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
    const p = new URL(linkedInProfileUrl({ pathName: "Forms That Flow", issuedAt: "2026-11-02T10:00:00Z", url, id: "UXG-P01-7K3Q9A" }));
    expect(p.pathname).toBe("/profile/add");
    expect(Object.fromEntries(p.searchParams)).toEqual({ startTask: "CERTIFICATION_NAME", name: "Forms That Flow certificate", organizationName: "UXGate", issueYear: "2026", issueMonth: "11", certUrl: url, certId: "UXG-P01-7K3Q9A" });
  });
});
