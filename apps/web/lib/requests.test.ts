import { describe, expect, it, vi } from "vitest";
import { bundle, getLessonVersion as fullLesson } from "@uxgate/content/full";

// The server loader reads lesson files from disk or Cloudflare assets; here the full bundle stands in for it.
vi.mock("./server/content", () => ({ getLessonVersion: async (id: string) => fullLesson(id) }));
import { describeRequest, statusOf, type RequestRow } from "./requests";

describe("my requests", () => {
  it("maps the stored status to what the learner sees", () => {
    expect(statusOf("open")).toBe("wait");
    expect(statusOf("accepted")).toBe("yes");
    expect(statusOf("declined")).toBe("kept");
  });
  it("describes a request against the real lesson: path, unit, step number, question and which option was theirs", async () => {
    const lesson = bundle.lessons.find((l) => l.body.steps.some((s) => (s as { options?: unknown }).options && (s as { answer?: unknown }).answer))!;
    const idx = lesson.body.steps.findIndex((s) => (s as { options?: unknown }).options && (s as { answer?: unknown }).answer);
    const step = lesson.body.steps[idx] as { id: string; options: { id: string }[]; answer: string[] };
    const wrong = step.options.find((o) => !step.answer.includes(o.id))!;
    const row: RequestRow = { id: "r1", lesson_id: lesson.lessonId, step_id: step.id, answer: { sel: [wrong.id] }, reason: "answer_works", note: null, status: "declined", created_at: "2026-11-01T00:00:00Z", reply: { en: "Kept", ar: "بقيت" }, replied_at: "2026-11-02T00:00:00Z", xp_added: 0 };
    const v = await describeRequest(row, "ar");
    expect(v.stepNo).toBe(idx + 1);
    expect(v.pathId).toBe(lesson.pathId);
    expect(v.question.length).toBeGreaterThan(0);
    expect(v.options.filter((o) => o.mine)).toHaveLength(1);
    expect(v.options.some((o) => o.correct)).toBe(true);
    expect(v.options[0].key).toBe("أ");
    expect(v.reply).toBe("بقيت");
    expect(v.status).toBe("kept");
  });
});
