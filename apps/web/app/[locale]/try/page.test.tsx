// /try is the guest sample. A signed-in learner is sent to /app (it used to fail with a 500 for them).
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {} }));
const getLearner = vi.fn();
vi.mock("@/lib/server/learner", () => ({ getLearner: () => getLearner() }));
const redirect = vi.fn((...a: unknown[]) => {
  void a;
  throw new Error("NEXT_REDIRECT");
});
vi.mock("@/i18n/navigation", () => ({ redirect: (a: unknown) => redirect(a) }));
vi.mock("@/lib/server/content", () => ({
  getLessonVersion: async () => ({ body: {}, hash: "h", pathId: "P01", unitId: "P01-U01", order: 0 }),
}));
vi.mock("@/lib/server/lesson-messages", () => ({ otherLocaleMessages: async () => ({}) }));
vi.mock("@uxgate/content", () => ({ getPath: () => ({ title: { en: "P" } }), getUnit: () => ({ skills: [] }) }));
vi.mock("@/components/lesson/LessonRunner", () => ({ LessonRunner: () => null, GUEST_ID: "guest" }));

import TryPage from "./page";

describe("/try", () => {
  beforeEach(() => {
    getLearner.mockReset();
    redirect.mockClear();
  });

  it("sends a signed-in learner to /app", async () => {
    getLearner.mockResolvedValue({ userId: "u1" });
    await expect(TryPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith({ href: "/app", locale: "en" });
  });

  it("shows the sample to a guest", async () => {
    getLearner.mockResolvedValue(null);
    const el = await TryPage({ params: Promise.resolve({ locale: "ar" }) });
    expect(redirect).not.toHaveBeenCalled();
    expect(el).toBeTruthy();
  });
});
