// Learning rules the Admins can change in the panel (Platform settings > Learning rules, SET-2). The defaults are the
// values the app always had; the server reads the current ones from app_settings (lib/server/app-config.ts) and passes
// them in. Pure, so the client screens and the tests share it.

export type LearningRules = {
  /** Goal days in one week that earn a freeze. */
  freezeGoalDays: number;
  /** Most freezes a learner can hold. */
  freezeMax: number;
  /** Wrong mastery answers before a skill stops coming back in the mastery round. */
  maxMasteryMisses: number;
  /** Fresh variants of one skill in one mastery round. */
  variantsPerSkill: number;
  /** Days from Shown to its review. */
  reviewAfterDays: number;
  /** Days before a missed review comes back. */
  missRetryDays: number;
  /** Length of a free trial (3, 7 or 14). */
  trialDays: number;
};

export const DEFAULT_RULES: LearningRules = {
  freezeGoalDays: 5, freezeMax: 2, maxMasteryMisses: 2, variantsPerSkill: 2, reviewAfterDays: 3, missRetryDays: 1, trialDays: 7,
};

/** Setting keys in app_settings, with the range the database accepts (0061, app_setting_problem). */
export const RULE_KEYS: Record<keyof LearningRules, { key: string; min: number; max: number; label: string; help: string; options?: number[] }> = {
  freezeGoalDays: { key: "learning.freeze_goal_days", min: 1, max: 7, label: "Goal days for a freeze", help: "Days in one week with the daily goal met that earn one streak freeze." },
  freezeMax: { key: "learning.freeze_max", min: 0, max: 5, label: "Most freezes held", help: "A learner never holds more freezes than this." },
  maxMasteryMisses: { key: "learning.max_mastery_misses", min: 1, max: 5, label: "Mastery misses before a skill rests", help: "After this many wrong mastery answers the skill stays Practiced and goes to spaced review." },
  variantsPerSkill: { key: "learning.variants_per_skill", min: 1, max: 4, label: "Variants per skill in a mastery round", help: "Fresh re-test questions for one missed skill in one round." },
  reviewAfterDays: { key: "learning.review_after_days", min: 1, max: 30, label: "Days until the first review", help: "Days after a skill is Shown before its review is due." },
  missRetryDays: { key: "learning.miss_retry_days", min: 1, max: 14, label: "Days before a missed review returns", help: "A missed review comes back after this many days." },
  trialDays: { key: "trial.days", min: 3, max: 14, label: "Free trial length", help: "Days of Pro in a free trial. Only used while the trials flag is on.", options: [3, 7, 14] },
};

/** The rules from app_settings values, each one falling back to its default when missing or out of range. */
export function rulesFrom(settings: Record<string, unknown> | null | undefined): LearningRules {
  const out = { ...DEFAULT_RULES };
  for (const [name, def] of Object.entries(RULE_KEYS) as [keyof LearningRules, (typeof RULE_KEYS)[keyof LearningRules]][]) {
    const v = settings?.[def.key];
    if (typeof v === "number" && Number.isInteger(v) && v >= def.min && v <= def.max && (!def.options || def.options.includes(v))) out[name] = v;
  }
  return out;
}
