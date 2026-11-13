import { NextResponse } from "next/server";
import { videoIds } from "@uxgate/content";
import { createClient } from "@/lib/supabase/server";
import { signBunnyUrl, bunnyConfigured } from "@/lib/server/bunny";
import { videoOpen } from "@/lib/billing/access";
import { readPro } from "@/lib/server/billing/account";
import { hostOf } from "@/lib/server/billing/config";
import { gatedOut } from "@/lib/coming-soon";

/** Test clip used until the real clips are ready. It is a public file, so it needs no signature. */
const TEST_CLIP = "test-clip";

/** A signed address for a clip used in a lesson. Only clips that a lesson uses can be asked for, only by a signed-in learner, and a Pro unit's clips only on Pro. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === TEST_CLIP)
    return NextResponse.json({ src: "/test/test-clip.mp4", kind: "mp4" }, { headers: { "cache-control": "no-store" } });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // Coming Soon: lessons, videos and review requests are for admins until launch (lib/coming-soon.ts).
  if (gatedOut(data.user)) return NextResponse.json({ error: "coming_soon" }, { status: 403 });
  if (!videoIds.has(id) || !/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: "unknown_video" }, { status: 404 });
  // A clip of a Pro unit is signed only for Pro (issue #137). The plan is read only when no free unit uses the clip.
  if (!videoOpen(id, false) && !(await readPro(supabase, data.user.id, hostOf(req))))
    return NextResponse.json({ error: "pro_required" }, { status: 403 });
  if (!bunnyConfigured()) return NextResponse.json({ error: "video_not_configured" }, { status: 503 });
  const src = signBunnyUrl(id, process.env.BUNNY_STREAM_CDN_HOST!, process.env.BUNNY_STREAM_TOKEN_KEY!);
  return NextResponse.json({ src, kind: "hls" }, { headers: { "cache-control": "no-store" } });
}
