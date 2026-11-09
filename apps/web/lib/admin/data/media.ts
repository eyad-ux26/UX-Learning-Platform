import "server-only";
import { content, type VideoStep } from "@uxgate/content";
import { getLessonVersion } from "@/lib/server/content";

// Media library (MED-1): every clip the lessons use, from the lessons themselves, so the list can never drift from
// what learners get. Clips are uploaded to Bunny Stream and named in the content files; captions come from each
// clip's transcript, so they always exist in English and Arabic.

export type Clip = {
  id: string; title: { en: string; ar: string } | null; seconds: number; lines: number; captionsOk: boolean;
  uses: { lessonId: string; stepId: string; lessonTitle: string }[]; pathIds: string[];
};

export async function clips(): Promise<Clip[]> {
  const units = new Set(Object.values(content.videos ?? {}).flat());
  const lessons = content.lessons.filter((l) => units.has(l.unitId));
  const bodies = await Promise.all(lessons.map(async (l) => ({ meta: l, v: await getLessonVersion(l.lessonId).catch(() => undefined) })));
  const by = new Map<string, Clip>();
  for (const { meta, v } of bodies) {
    for (const s of v?.body.steps ?? []) {
      if (s.type !== "video") continue;
      const st = s as VideoStep;
      const c = by.get(st.video) ?? { id: st.video, title: st.title ?? null, seconds: st.duration, lines: st.transcript.length, captionsOk: st.transcript.every((t) => t.en.trim() && t.ar.trim()), uses: [], pathIds: [] };
      c.uses.push({ lessonId: meta.lessonId, stepId: st.id, lessonTitle: meta.body.title.en });
      const p = meta.lessonId.slice(0, 3);
      if (!c.pathIds.includes(p)) c.pathIds.push(p);
      by.set(st.video, c);
    }
  }
  return [...by.values()].sort((a, b) => a.uses[0].lessonId.localeCompare(b.uses[0].lessonId));
}
