export type Locale = "en" | "ar";
export type Text = { en: string; ar: string };
/** Mock text may be a plain string (same in both languages) or bilingual. */
export type MockText = string | Text;

export type MockBlock = {
  kind: string;
  text?: MockText;
  label?: MockText;
  hint?: MockText;
  error?: MockText;
  gap?: "xs" | "s" | "m" | "l" | "xl";
  size?: string;
  emphasis?: "high" | "low";
  tone?: string;
  color?: string;
  weight?: string;
  px?: number;
  filled?: boolean;
  focus?: boolean;
  selected?: boolean;
  hintFirst?: boolean;
  code?: string;
  options?: MockText[];
  value?: number;
  blocks?: MockBlock[];
  [extra: string]: unknown;
};
export type Mock = { width?: number; caption?: Text; frame?: "wide"; dir?: "rtl" | "ltr"; gray?: boolean; blur?: number; blocks: MockBlock[] };

export type Option = { id: string; text: Text; mock?: Mock };
export type Misconception = { id: string; when: string | string[]; feedback: Text };
export type ReasonQuestion = { prompt: Text; options: { id: string; text: Text }[]; answer: string[]; misconceptions?: Misconception[] };

type StepBase = { id: string; part: string; scenario?: Text; mock?: Mock };
export type CardStep = StepBase & { type: "card"; title?: Text; body: Text; icons?: string[] };
type QuestionBase = StepBase & {
  skill: string;
  prompt: Text;
  hints?: Text[];
  correct: Text;
  explain: Text;
  misconceptions?: Misconception[];
  confidence?: boolean;
  also_ok?: { answer: string[]; feedback: Text }[];
};
export type ChooseStep = QuestionBase & { type: "choose"; options: Option[]; answer: string[]; multi?: boolean };
export type TuneStep = QuestionBase & { type: "tune"; options: Option[]; answer: string[]; start?: string };
export type CompareStep = QuestionBase & {
  type: "compare";
  a: { mock: Mock; label?: Text };
  b: { mock: Mock; label?: Text };
  answer: "a" | "b";
  reason?: ReasonQuestion;
};
export type Step = CardStep | ChooseStep | TuneStep | CompareStep;
export type QuestionStep = Exclude<Step, CardStep>;

export type Lesson = {
  id: string;
  mode: "lesson" | "check";
  minutes: number;
  title: Text;
  review_labels?: Record<string, Text>;
  steps: Step[];
};
export type LessonVersion = { lessonId: string; unitId: string; pathId: string; order: number; mode: string; minutes: number; hash: string; body: Lesson };
export type Skill = { id: string; title: Text; can_do: Text };
export type UnitMeta = { id: string; pathId: string; title: Text; skill: Text; free: boolean; skills: Skill[]; lessons: string[] };
export type PathMeta = { id: string; title: Text; subtitle: Text };
export type Bundle = { paths: PathMeta[]; units: UnitMeta[]; lessons: LessonVersion[] };
