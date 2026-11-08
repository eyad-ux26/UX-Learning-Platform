import { describe, expect, it } from "vitest";
import { content } from "@uxgate/content";
import { attemptKind, teamPlan } from "./team-tools";

describe("teamPlan", () => {
  const path = content.paths[0].id;
  const units = content.units.filter((u) => u.pathId === path);
  it("takes every unit when no limit is given, lessons in play order", () => {
    const p = teamPlan(path);
    expect(p.unitIds).toEqual(units.map((u) => u.id));
    expect(p.lessonIds.length).toBe(content.lessons.filter((l) => l.pathId === path).length);
    expect(p.skillIds.length).toBeGreaterThan(0);
  });
  it("stops at the unit asked for, and clamps a limit past the end", () => {
    expect(teamPlan(path, 1).unitIds).toEqual([units[0].id]);
    expect(teamPlan(path, 999).unitIds).toEqual(units.map((u) => u.id));
    expect(teamPlan(path, 0)).toEqual({ lessonIds: [], skillIds: [], unitIds: [] });
  });
  it("is empty for an unknown path", () => {
    expect(teamPlan("P99")).toEqual({ lessonIds: [], skillIds: [], unitIds: [] });
  });
  it("keeps skill checks as checks", () => {
    expect(attemptKind("check")).toBe("check");
    expect(attemptKind("lesson")).toBe("lesson");
  });
});
