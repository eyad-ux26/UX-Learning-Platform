import { content } from "@uxgate/content";
import { pathSkills } from "./certificate";

/** The three numbers on a certificate: skills in the path, its skill checks and its lessons (banks are not lessons). */
export function certStats(pathId: string) {
  const lessons = content.lessons.filter((l) => l.pathId === pathId);
  return {
    skills: pathSkills(pathId).length,
    checks: lessons.filter((l) => l.mode === "check").length,
    lessons: lessons.length,
  };
}
