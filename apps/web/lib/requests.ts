// "My requests": a review request from a lesson, described for the learner. Pure, so it is tested against real content.
import { localPathName } from "./catalog-list";
import { getUnit, getCast } from "@uxgate/content";
import { getLessonVersion } from "./server/content";

export type RequestRow = {
  id: string; lesson_id: string; step_id: string; answer: { sel?: string[] } | null; reason: string; note: string | null;
  status: "open" | "accepted" | "declined"; created_at: string; reply: { en?: string; ar?: string } | string | null; replied_at: string | null; xp_added: number;
};
export type RequestStatus = "yes" | "wait" | "kept";
export const statusOf = (s: RequestRow["status"]): RequestStatus => (s === "accepted" ? "yes" : s === "declined" ? "kept" : "wait");

type L = "en" | "ar";
const txt = (t: unknown, locale: L): string => {
  if (!t) return "";
  if (typeof t === "string") return t;
  const o = t as Record<string, string>;
  return o[locale] ?? o.en ?? "";
};

export type RequestView = {
  id: string; status: RequestStatus; pathId: string; pathTitle: string; unitNo: number; lessonNo: number; stepNo: number;
  question: string; scenario: string; speaker: { name: string; role: string; id: string } | null;
  options: { key: string; label: string; mine: boolean; correct: boolean }[];
  reason: string; note: string | null; createdAt: string; repliedAt: string | null; reply: string; xp: number; lessonId: string; isNew: boolean;
};

const KEYS = { en: ["A", "B", "C", "D", "E", "F"], ar: ["أ", "ب", "ج", "د", "هـ", "و"] };

/** Loads only that one lesson file (for its steps). */
export async function describeRequest(r: RequestRow, locale: L): Promise<RequestView> {
  const lesson = await getLessonVersion(r.lesson_id);
  const unit = lesson ? getUnit(lesson.unitId) : undefined;
  const steps = lesson?.body.steps ?? [];
  const idx = steps.findIndex((s) => s.id === r.step_id);
  const step = idx >= 0 ? (steps[idx] as unknown as Record<string, unknown>) : null;
  const unitNo = Number(/-U(\d+)/.exec(r.lesson_id)?.[1] ?? 0);
  const lessonNo = Number(/-L(\d+)/.exec(r.lesson_id)?.[1] ?? 0);
  const sel = new Set(r.answer?.sel ?? []);
  const answer = new Set((step?.answer as string[] | undefined) ?? []);
  const opts = (step?.options as { id: string; text: unknown }[] | undefined) ?? [];
  const cast = getCast((step?.speaker as string | undefined) ?? lesson?.body.speaker);
  const reply = typeof r.reply === "string" ? r.reply : r.reply ? r.reply[locale] ?? r.reply.en ?? "" : "";
  return {
    id: r.id, status: statusOf(r.status), lessonId: r.lesson_id,
    pathId: lesson?.pathId ?? r.lesson_id.split("-")[0], pathTitle: localPathName(lesson?.pathId ?? r.lesson_id.split("-")[0], locale),
    unitNo: unitNo || (unit ? 1 : 0), lessonNo, stepNo: idx + 1,
    question: txt(step?.prompt, locale), scenario: txt(step?.scenario, locale),
    speaker: cast ? { id: cast.id, name: locale === "ar" ? cast.ar : cast.en, role: locale === "ar" ? cast.role_ar : cast.role_en } : null,
    options: opts.map((o, i) => ({ key: KEYS[locale][i] ?? String(i + 1), label: txt(o.text, locale), mine: sel.has(o.id), correct: answer.has(o.id) })),
    reason: r.reason, note: r.note, createdAt: r.created_at, repliedAt: r.replied_at, reply, xp: r.xp_added || 0,
    isNew: !!r.replied_at && Date.now() - new Date(r.replied_at).getTime() < 7 * 86_400_000,
  };
}

export const REQUEST_COLUMNS = "id, lesson_id, step_id, answer, reason, note, status, created_at, reply, replied_at, xp_added";

/** Made-up requests for UG_DEV_FIXTURE screens. */
export function fixtureRequests(): RequestRow[] {
  const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  return [
    { id: "00000000-0000-4000-9000-000000000001", lesson_id: "P01-U01-L01", step_id: "S02", answer: { sel: [] }, reason: "answer_works", note: "Cards allow only one pick, like radio buttons, and show every plan.", status: "accepted", created_at: ago(30), reply: { en: "You’re right. We now accept this answer and updated the feedback on this step.", ar: "معك حق. أصبحنا نقبل هذه الإجابة، وحدّثنا الملاحظات في هذه الخطوة." }, replied_at: ago(2), xp_added: 10 },
    { id: "00000000-0000-4000-9000-000000000002", lesson_id: "P01-U01-L02", step_id: "S03", answer: { sel: [] }, reason: "unclear", note: null, status: "open", created_at: ago(26), reply: null, replied_at: null, xp_added: 0 },
  ];
}
