import { NextResponse } from "next/server";
import { z } from "zod";
import { getLessonVersion } from "@/lib/server/content";
import { isQuestion } from "@uxgate/player/engine";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withinDbLimit } from "@/lib/server/rate-limit";
import { gatedOut } from "@/lib/coming-soon";

const REVIEW_REASONS = ["answer_works", "unclear", "broken", "other"] as const;
const NOTE_MAX = 280;

const body = z.object({
  lessonId: z.string().min(1).max(60),
  hash: z.string().length(64),
  stepId: z.string().min(1).max(40),
  answer: z.object({
    sel: z.array(z.string().max(60)).max(20),
    reason: z.array(z.string().max(60)).max(10).optional(),
  }),
  reason: z.enum(REVIEW_REASONS),
  note: z.string().max(NOTE_MAX).optional(),
});

/** "Ask for a review": a learner thinks a graded answer also works. Stored for the admin side; nothing changes in the lesson. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // Coming Soon: lessons, videos and review requests are for admins until launch (lib/coming-soon.ts).
  if (gatedOut(auth.user)) return NextResponse.json({ error: "coming_soon" }, { status: 403 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;

  const lesson = await getLessonVersion(b.lessonId);
  const step = lesson?.body.steps.find((s) => s.id === b.stepId);
  if (!lesson || !step || !isQuestion(step)) return NextResponse.json({ error: "unknown_step" }, { status: 404 });

  const db = createAdminClient();
  // A learner can send a handful a day; the same step twice in a row is one request.
  if (!(await withinDbLimit(db, auth.user.id, "review-requests-day", 20, 86_400)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "3600" } });
  const { data: version } = await db
    .from("content_versions")
    .select("id")
    .eq("lesson_id", b.lessonId)
    .eq("hash", b.hash)
    .maybeSingle();
  const { data: dup } = await db
    .from("review_requests")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("lesson_id", b.lessonId)
    .eq("step_id", b.stepId)
    .eq("status", "open")
    .maybeSingle();
  if (dup) return NextResponse.json({ sent: true, duplicate: true });
  const { error } = await db.from("review_requests").insert({
    user_id: auth.user.id,
    lesson_id: b.lessonId,
    step_id: b.stepId,
    content_version_id: version?.id ?? null,
    answer: b.answer,
    reason: b.reason,
    note: b.note?.trim() ? b.note.trim() : null,
  });
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ sent: true });
}
