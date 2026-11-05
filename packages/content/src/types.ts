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

/** `speaker` is a cast id: that character tells `scenario` in first person. The compiler fills it from the lesson's speaker when the step has none; without a speaker the scenario shows as a plain line. */
type StepBase = { id: string; part: string; scenario?: Text; speaker?: string; mock?: Mock };
export type CardPoint = { icon: string; en: string; ar: string };
export type CardStep = StepBase & { type: "card"; title?: Text; body?: Text; points?: CardPoint[]; icons?: string[] };
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
/** words, predict and fix play exactly like choose: one option (or several with multi). */
export type WordsStep = Omit<ChooseStep, "type"> & { type: "words" };
export type PredictStep = Omit<ChooseStep, "type"> & { type: "predict" };
export type FixStep = Omit<ChooseStep, "type"> & { type: "fix" };
/** Items go into buckets: `answer` maps a bucket id to the item ids that belong in it. */
export type SortStep = QuestionBase & {
  type: "sort";
  items: { id: string; text: Text }[];
  buckets: { id: string; title: Text }[];
  answer: Record<string, string[]>;
};
/** `items` come in their starting order; the learner moves them up and down. `answer` is the right order of ids. */
export type OrderStep = QuestionBase & {
  type: "order";
  items: { id: string; text: Text; kind?: string; emphasis?: string }[];
  answer: string[];
  onscreen?: boolean;
  caption?: Text;
  also_ok?: { answer: string[]; feedback: Text }[];
};
/** `answer` maps a left id to its right id. */
export type MatchStep = QuestionBase & {
  type: "match";
  left: { id: string; text: Text }[];
  right: { id: string; text: Text }[];
  /** Optional column headers, such as "Field" and "Used for". Without them the player shows its generic ones. */
  headers?: { left: Text; right: Text };
  answer: Record<string, string>;
};
/** The learner taps a `region` of the mock (or picks it from the list). */
export type SpotStep = QuestionBase & {
  type: "spot";
  regions: { id: string; label: Text }[];
  answer: string[];
};
/** A short clip. Not graded. `video` is the Bunny Stream video id; captions are drawn from `transcript`, so they exist in both languages. */
export type VideoStep = StepBase & {
  type: "video";
  title?: Text;
  video: string;
  duration: number;
  transcript: { t: number; en: string; ar: string }[];
};
export type Step = VideoStep | CardStep | ChooseStep | WordsStep | PredictStep | FixStep | TuneStep | CompareStep | SortStep | OrderStep | MatchStep | SpotStep;
export type QuestionStep = Exclude<Step, CardStep | VideoStep>;

export type Lesson = {
  id: string;
  mode: "lesson" | "check" | "bank";
  minutes: number;
  title: Text;
  summary?: Text;
  speaker?: string;
  review_labels?: Record<string, Text>;
  steps: Step[];
};
export type LessonVersion = { lessonId: string; unitId: string; pathId: string; order: number; mode: string; minutes: number; hash: string; body: Lesson };
export type Skill = { id: string; title: Text; can_do: Text };
export type UnitMeta = { id: string; pathId: string; title: Text; skill: Text; free: boolean; skills: Skill[]; lessons: string[] };
export type PathMeta = { id: string; title: Text; subtitle: Text };
/** `lessons` are the playable lessons; `banks` hold each unit's held-back re-test steps for the mastery round (mode "bank"). */
export type Bundle = { cast: CastMember[]; paths: PathMeta[]; units: UnitMeta[]; lessons: LessonVersion[]; banks: LessonVersion[] };
/** A lesson without its steps: enough for maps, lists and titles. */
export type LessonMeta = Omit<LessonVersion, "body"> & { body: Omit<Lesson, "steps" | "review_labels">; /** The lesson's file in dist/lessons (a content hash). */ file: string };
/** What the app parses up front (dist/index.json). */
export type ContentIndex = { paths: PathMeta[]; units: UnitMeta[]; lessons: LessonMeta[]; banks: LessonMeta[]; /** Video id -> the units whose lessons use it. */ videos: Record<string, string[]> };

export type CastMember = { id: string; en: string; ar: string; role_en: string; role_ar: string; age?: string };
