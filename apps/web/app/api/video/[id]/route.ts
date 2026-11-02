import { NextResponse } from "next/server";
import { bundle } from "@uxgate/content";
import { createClient } from "@/lib/supabase/server";
import { signBunnyUrl, bunnyConfigured } from "@/lib/server/bunny";

/** Test clip used until the real clips are ready. It is a public file, so it needs no signature. */
export const TEST_CLIP = "test-clip";

const videoIds = new Set(bundle.lessons.flatMap((l) => l.body.steps.flatMap((s) => (s.type === "video" ? [s.video] : []))));

/** A signed address for a clip used in a lesson. Only clips that a lesson uses can be asked for, and only by a signed-in learner. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === TEST_CLIP) return NextResponse.json({ src: "/test/test-clip.mp4", kind: "mp4" }, { headers: { "cache-control": "no-store" } });
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!videoIds.has(id) || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "unknown_video" }, { status: 404 });
  if (!bunnyConfigured()) return NextResponse.json({ error: "video_not_configured" }, { status: 503 });
  const src = signBunnyUrl(id, process.env.BUNNY_STREAM_CDN_HOST!, process.env.BUNNY_STREAM_TOKEN_KEY!);
  return NextResponse.json({ src, kind: "hls" }, { headers: { "cache-control": "no-store" } });
}
