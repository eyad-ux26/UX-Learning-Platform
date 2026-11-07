import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signTeamPass, TEAM_PASS_SECONDS, teamPassValid, teamPasswordMatches } from "./team-access";

beforeEach(() => { process.env.UG_TEAM_PASSWORD = "correct horse battery staple"; process.env.EMAIL_LINK_SECRET = "link-secret"; });
afterEach(() => { delete process.env.UG_TEAM_PASSWORD; delete process.env.EMAIL_LINK_SECRET; });

describe("team password", () => {
  it("matches only the exact secret", async () => {
    expect(await teamPasswordMatches("correct horse battery staple")).toBe(true);
    expect(await teamPasswordMatches("correct horse battery stapl")).toBe(false);
    expect(await teamPasswordMatches("")).toBe(false);
    expect(await teamPasswordMatches("x".repeat(500))).toBe(false);
  });
  it("lets nobody in when no password, or a short one, is set", async () => {
    delete process.env.UG_TEAM_PASSWORD;
    expect(await teamPasswordMatches("")).toBe(false);
    expect(await signTeamPass()).toBeNull();
    process.env.UG_TEAM_PASSWORD = "short";
    expect(await teamPasswordMatches("short")).toBe(false);
  });
});

describe("team pass cookie", () => {
  it("is valid for 12 hours", async () => {
    const now = Date.UTC(2026, 10, 6, 0, 0, 0);
    const pass = await signTeamPass(now);
    expect(await teamPassValid(pass, now + 1000)).toBe(true);
    expect(await teamPassValid(pass, now + TEAM_PASS_SECONDS * 1000 + 1)).toBe(false);
  });
  it("is refused when altered, made up, or after the password changes", async () => {
    const now = Date.now();
    const pass = (await signTeamPass(now))!;
    const [exp, sig] = pass.split(".");
    expect(await teamPassValid(`${Number(exp) + 100}.${sig}`, now)).toBe(false);
    expect(await teamPassValid(`${exp}.${"0".repeat(64)}`, now)).toBe(false);
    expect(await teamPassValid("1", now)).toBe(false);
    expect(await teamPassValid(undefined, now)).toBe(false);
    process.env.UG_TEAM_PASSWORD = "a brand new team password";
    expect(await teamPassValid(pass, now)).toBe(false);
  });
});
