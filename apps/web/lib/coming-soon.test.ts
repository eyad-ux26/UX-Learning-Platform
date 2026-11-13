import { afterEach, describe, expect, it } from "vitest";
import { comingSoonOn, gatedOut, gateStep, isAdmin } from "./coming-soon";

afterEach(() => {
  delete process.env.UG_COMING_SOON;
});

describe("gateStep", () => {
  it("keeps the page, its confirm link, the team password page and the legal pages open", () => {
    for (const p of [
      "/en/coming-soon",
      "/ar/coming-soon/confirm",
      "/en/team",
      "/en/pricing",
      "/ar/pricing/",
      "/en/terms",
      "/ar/privacy",
      "/en/refund/",
      "/en/maintenance",
      "/ar/offline",
    ]) {
      expect(gateStep(p).kind, p).toBe("open");
    }
  });
  it("keeps a public certificate page open (so LinkedIn can read it) but not the /c list or a malformed code", () => {
    expect(gateStep("/en/c/k3j9x0a2b7qz")).toEqual({ kind: "open", index: false });
    expect(gateStep("/ar/c/k3j9x0a2b7qz/")).toEqual({ kind: "open", index: false });
    expect(gateStep("/ar/rate/AbC_dEf-0123456789abcdefghijklmnopqrstuvw")).toEqual({ kind: "open", index: false });
    for (const p of ["/en/rate", "/en/rate/short", "/en/rate/AbC_dEf-0123456789abcdefghijklmnopqrstuvw/x"])
      expect(gateStep(p).kind, p).toBe("admin");
    for (const p of ["/en/c", "/en/c/", "/en/c/short", "/en/c/K3J9X0A2B7QZ", "/en/c/k3j9x0a2b7qz/extra"])
      expect(gateStep(p).kind, p).toBe("admin");
  });
  it("puts the sign-in pages behind the team pass", () => {
    expect(gateStep("/ar/signin")).toEqual({ kind: "team", locale: "ar", to: "/ar/coming-soon", index: false });
    for (const p of ["/en/forgot", "/en/reset/"]) expect(gateStep(p).kind, p).toBe("team");
  });
  it("lets only the legal pages be indexed among the open ones", () => {
    expect(gateStep("/en/terms")).toEqual({ kind: "open", index: true });
    expect(gateStep("/ar/pricing")).toEqual({ kind: "open", index: true });
    for (const p of ["/en/pricingx", "/en/pricing/extra", "/en/app/plans", "/en/app/pricing"])
      expect(gateStep(p).kind, p).toBe("admin");
    expect(gateStep("/en/team")).toEqual({ kind: "open", index: false });
    expect(gateStep("/en/coming-soon")).toEqual({ kind: "open", index: false }); // indexed under the home address instead
  });
  it("sends everything else to Coming Soon in its own language, indexing only the home address", () => {
    expect(gateStep("/ar")).toEqual({ kind: "admin", locale: "ar", to: "/ar/coming-soon", index: true });
    expect(gateStep("/en/")).toEqual({ kind: "admin", locale: "en", to: "/en/coming-soon", index: true });
    for (const p of [
      "/en/app",
      "/ar/app/path/P01",
      "/en/signup",
      "/en/paths",
      "/en/try",
      "/en/u/sara",
      "/en/onboarding",
      "/en/coming-soonx",
      "/en/signin/extra",
    ]) {
      const s = gateStep(p);
      expect(s.kind, p).toBe("admin");
      if (s.kind === "admin") expect(s.index, p).toBe(false);
    }
  });
  it("leaves addresses without a language to next-intl, which redirects them first", () => {
    expect(gateStep("/")).toEqual({ kind: "pass" });
    expect(gateStep("/app")).toEqual({ kind: "pass" });
    expect(gateStep("/english")).toEqual({ kind: "pass" });
  });
});

describe("admins", () => {
  it("are accounts whose app_metadata.role is admin", () => {
    expect(isAdmin({ app_metadata: { role: "admin" } })).toBe(true);
    expect(isAdmin({ app_metadata: { role: "learner" } })).toBe(false);
    expect(isAdmin({ app_metadata: { team_tools: true } })).toBe(true);
    expect(isAdmin({ app_metadata: { team_tools: "true" } })).toBe(false);
    expect(isAdmin({ app_metadata: {} })).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
  it("the gate is off unless UG_COMING_SOON is 1, and then keeps out everyone else", () => {
    expect(comingSoonOn()).toBe(false);
    expect(gatedOut(null)).toBe(false);
    process.env.UG_COMING_SOON = "1";
    expect(comingSoonOn()).toBe(true);
    expect(gatedOut(null)).toBe(true);
    expect(gatedOut({ app_metadata: { role: "editor" } })).toBe(true);
    expect(gatedOut({ app_metadata: { role: "admin" } })).toBe(false);
  });
});
