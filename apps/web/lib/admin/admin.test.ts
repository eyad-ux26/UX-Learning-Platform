import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isAutomatic, languageOf, categoryOf, stripQuoted } = await import("./inbound");
const { refundRule, needsSecondPerson } = await import("./data/refunds");
const { codeState } = await import("./data/billing");
const { fillPlaceholders, ticketIdIn, subjectWithId } = await import("./data/support");
const { cairoMidnight, windows, moneyIn, dailyByProvider, dashboardView } = await import("./data/dashboard");
const { navFor, permsOf } = await import("./permissions");
const { maskEmail } = await import("./mask");
import type { AdminCtx } from "./guard";

const ctxOf = (roles: string[]): AdminCtx => ({
  userId: "u", email: "a@uxgate.org", name: "A", roles, perms: permsOf(roles), founding: false, sessionId: "s", ip: "", ua: "", totpAt: null, env: "staging",
});

describe("support email intake", () => {
  it("skips automatic mail and our own", () => {
    expect(isAutomatic({ from: "mailer-daemon@x.com", autoSubmitted: null, subject: "Hi" })).toBe(true);
    expect(isAutomatic({ from: "a@b.com", autoSubmitted: "auto-replied", subject: "Hi" })).toBe(true);
    expect(isAutomatic({ from: "a@b.com", autoSubmitted: null, subject: "Out of office: back Monday" })).toBe(true);
    expect(isAutomatic({ from: "hello@uxgate.org", autoSubmitted: null, subject: "Hi" })).toBe(true);
    expect(isAutomatic({ from: "sara@gmail.com", autoSubmitted: "no", subject: "Can't sign in" })).toBe(false);
  });
  it("guesses the language and category", () => {
    expect(languageOf("لا أستطيع تسجيل الدخول")).toBe("ar");
    expect(languageOf("I can't sign in")).toBe("en");
    expect(categoryOf("Refund please", "")).toBe("billing");
    expect(categoryOf("", "رابط الدخول لا يعمل")).toBe("account");
    expect(categoryOf("Hello", "just saying hi")).toBe("other");
  });
  it("keeps only the new part of a reply", () => {
    expect(stripQuoted("Thanks, it works now.\n\nOn Mon, 9 Nov 2026 at 10:00 UXGate wrote:\n> old text")).toBe("Thanks, it works now.");
    expect(stripQuoted("> only quoted")).toBe("> only quoted");
  });
  it("finds the ticket number in a subject and adds it once", () => {
    expect(ticketIdIn("Re: Sign-in link [#1042]")).toBe(1042);
    expect(ticketIdIn("Re: #1042")).toBeNull();
    expect(subjectWithId("Sign-in link", 1042)).toBe("Sign-in link [#1042]");
    expect(subjectWithId("Re: Sign-in link [#1042]", 1042)).toBe("Re: Sign-in link [#1042]");
  });
  it("fills macro placeholders and leaves unknown ones", () => {
    expect(fillPlaceholders("Hi {first_name}, {agent_name} here. {unknown}", { first_name: "Sara", agent_name: "Omar" })).toBe("Hi Sara, Omar here. {unknown}");
    expect(fillPlaceholders("Hi {first_name}", {})).toBe("Hi {first_name}");
  });
});

describe("refund rules", () => {
  const now = Date.parse("2026-11-09T12:00:00Z");
  it("counts the 7 days from the charge", () => {
    expect(refundRule("2026-11-03T12:00:00Z", now)).toMatchObject({ inside: true, days: 6, text: "Inside 7 days · last day" });
    expect(refundRule("2026-11-02T12:00:00Z", now)).toMatchObject({ inside: false, days: 7 });
  });
  it("needs a second person outside the window or over the limit, unless the role may approve any", () => {
    const agent = ctxOf(["support_agent"]);
    const lead = ctxOf(["support_lead"]);
    const pay = (minor: number, currency: string, paid_at = "2026-11-08T12:00:00Z") => ({ amount_minor: minor, currency, paid_at });
    expect(needsSecondPerson(agent, pay(800, "USD"), 5000, now)).toBeNull();
    expect(needsSecondPerson(agent, pay(7200, "USD"), 5000, now)).toBe("over your limit");
    expect(needsSecondPerson(agent, pay(800, "USD", "2026-10-01T00:00:00Z"), 5000, now)).toBe("outside the 7 days");
    expect(needsSecondPerson(lead, pay(7200, "USD", "2026-10-01T00:00:00Z"), 5000, now)).toBeNull();
  });
});

describe("discount codes", () => {
  const now = Date.parse("2026-11-09T12:00:00Z");
  const c = { active: true, starts_at: null, ends_at: null, max_uses: null, uses: 0 };
  it("is ended by date or by uses, paused when switched off, scheduled before it starts", () => {
    expect(codeState(c, now)).toBe("active");
    expect(codeState({ ...c, ends_at: "2026-11-01T00:00:00Z" }, now)).toBe("ended");
    expect(codeState({ ...c, max_uses: 100, uses: 100 }, now)).toBe("ended");
    expect(codeState({ ...c, active: false }, now)).toBe("paused");
    expect(codeState({ ...c, starts_at: "2026-12-01T00:00:00Z" }, now)).toBe("scheduled");
  });
});

describe("dashboard", () => {
  it("starts days at Cairo midnight", () => {
    expect(cairoMidnight(new Date("2026-11-09T01:30:00Z")).toISOString()).toBe("2026-11-08T22:00:00.000Z");
    expect(cairoMidnight(new Date("2026-11-08T21:30:00Z")).toISOString()).toBe("2026-11-07T22:00:00.000Z");
  });
  it("compares today with the same day last week, up to the same time", () => {
    const now = new Date("2026-11-09T10:00:00Z");
    const w = windows("today", now);
    expect(w.from.toISOString()).toBe("2026-11-08T22:00:00.000Z");
    expect(w.prevTo.toISOString()).toBe("2026-11-02T10:00:00.000Z");
    const m = windows("7d", now);
    expect(m.prevTo.getTime()).toBe(m.from.getTime());
    expect((m.from.getTime() - m.prevFrom.getTime()) / 86_400_000).toBe(7);
  });
  it("adds money by day in USD", () => {
    const rows = [
      { day: "2026-11-09", provider: "paddle", currency: "USD", paid_minor: 800, payments: 1, refunded_minor: 0, refunds: 0 },
      { day: "2026-11-09", provider: "paymob", currency: "EGP", paid_minor: 24900, payments: 1, refunded_minor: 24900, refunds: 1 },
      { day: "2026-11-01", provider: "paddle", currency: "USD", paid_minor: 500, payments: 1, refunded_minor: 0, refunds: 0 },
    ];
    const today = moneyIn(rows, new Date("2026-11-08T22:00:00Z"), new Date("2026-11-09T10:00:00Z"));
    expect(today.refunds).toBe(1);
    expect(today.paid).toBeGreaterThan(800);
    const d = dailyByProvider(rows, 3, new Date("2026-11-09T10:00:00Z"));
    expect(d.days).toEqual(["2026-11-07", "2026-11-08", "2026-11-09"]);
    expect(d.series.paddle).toEqual([0, 0, 800]);
  });
  it("shows each role its own view", () => {
    expect(dashboardView(ctxOf(["super_admin"]))).toBe("business");
    expect(dashboardView(ctxOf(["support_agent"]))).toBe("support");
    expect(dashboardView(ctxOf(["content_editor"]))).toBe("content");
  });
});

describe("menu and masking", () => {
  it("shows only what the roles open", () => {
    const ids = (roles: string[]) => navFor(permsOf(roles)).flatMap((g) => g.items.map((i) => i.id));
    expect(ids(["support_agent"])).toEqual(expect.arrayContaining(["dashboard", "mywork", "learners", "inbox", "appeals"]));
    expect(ids(["support_agent"])).not.toContain("revenue");
    expect(ids(["support_agent"])).not.toContain("team");
    expect(ids(["super_admin"])).toEqual(expect.arrayContaining(["revenue", "team", "audit"]));
  });
  it("masks emails", () => {
    expect(maskEmail("sara.ahmed@gmail.com")).not.toContain("sara.ahmed");
    expect(maskEmail(null)).toBe("");
  });
});
