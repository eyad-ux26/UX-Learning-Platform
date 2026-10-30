import { z } from "zod";

export const GOALS = ["g1", "g2", "g3", "g4"] as const;
export const FOCUSES = ["forms", "hier", "usab", "none"] as const;
export const TIMES = ["t1", "t2", "t3"] as const;
/** Which path each answer to "what first?" points to. Paths with no content yet fall back to the first playable one. */
export const FOCUS_PATH: Record<(typeof FOCUSES)[number], string | null> = { forms: "P01", hier: "P02", usab: "P03", none: null };

const validZone = (tz: string) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };

export const onboardingSchema = z.object({
  goal: z.enum(GOALS).nullable(),
  focus: z.enum(FOCUSES).nullable(),
  weeklyTime: z.enum(TIMES).nullable(),
  dailyGoal: z.number().int().min(1).max(3),
  reminder: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  timeZone: z.string().max(60).refine(validZone).nullable(),
  skipped: z.boolean(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
