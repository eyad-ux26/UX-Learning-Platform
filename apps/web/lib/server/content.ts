// Whole lessons for the server. Each lesson is a static file in public/c/ (copied from packages/content/dist/lessons
// at build time, named by a hash of its content). On Cloudflare the Worker reads it through its ASSETS binding, so the
// lessons are not part of the Worker's code; under Node (next dev / next start) it reads the file from disk.
//
// Admin panel Phase 2 (0060): while the flag content_db is on, learners get the version that is live in the database
// (lesson_live), which the panel can publish and roll back. When it is the compiled version (the usual case) nothing
// changes; when it differs, its body is read once from content_versions and kept for this isolate. Any database
// problem falls back to the compiled files.
import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createLessonLoader, type LessonVersion, type Lesson } from "@uxgate/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { flagOn } from "@/lib/app-config";

type Assets = { fetch(input: string): Promise<Response> };

async function read(file: string): Promise<unknown> {
  let assets: Assets | undefined;
  try { assets = (getCloudflareContext().env as { ASSETS?: Assets }).ASSETS; } catch { assets = undefined; } // not on Cloudflare
  if (assets) {
    const res = await assets.fetch(`https://assets.local/c/${file}`);
    if (!res.ok) throw new Error(`lesson file ${file}: ${res.status}`);
    return res.json();
  }
  const [{ readFile }, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
  return JSON.parse(await readFile(path.join(process.cwd(), "public", "c", file), "utf8"));
}

const compiled = createLessonLoader(read);

const LIVE_TTL_MS = 60_000;
let live: { at: number; map: Map<string, string> } | null = null;
let liveRefreshingUntil = 0;
// Version bodies never change, so each one is kept for the isolate once loaded. Only settled values are shared between
// requests, never a promise: on Workers, I/O started by a request that has ended can be cancelled, and a shared promise
// that never settles would hang every later request waiting on it.
const bodies = new Map<string, Lesson | null>();

/** lesson id -> live hash, at most a minute old; null when the flag is off or the database cannot say. */
async function liveHashes(): Promise<Map<string, string> | null> {
  if (!hasServiceKey() || !(await flagOn("content_db"))) return null;
  const now = Date.now();
  if (live && now - live.at < LIVE_TTL_MS) return live.map;
  // Another request in this isolate is refreshing: keep the last answer meanwhile (up to five minutes old).
  if (live && now - live.at < 5 * LIVE_TTL_MS && now < liveRefreshingUntil) return live.map;
  liveRefreshingUntil = now + 2_000;
  try {
    const { data, error } = await createAdminClient().rpc("content_live_hashes");
    if (error) throw new Error(error.message);
    const map = new Map(((data ?? []) as { lesson_id: string; hash: string }[]).map((r) => [r.lesson_id, r.hash]));
    live = { at: Date.now(), map };
    return map;
  } catch (e) {
    console.warn("content: live versions unavailable, serving the compiled ones", (e as Error).message);
    return live?.map ?? null;
  } finally {
    liveRefreshingUntil = 0;
  }
}

/** A stored version's body, loaded once per isolate. */
async function storedBody(lessonId: string, hash: string): Promise<Lesson | null> {
  const k = `${lessonId}:${hash}`;
  if (bodies.has(k)) return bodies.get(k)!;
  const { data, error } = await createAdminClient().from("content_versions").select("body").eq("lesson_id", lessonId).eq("hash", hash).maybeSingle();
  if (error) throw new Error(error.message);
  const b = data?.body as Lesson | undefined;
  const body = b && Array.isArray(b.steps) ? b : null;
  if (bodies.size > 500) bodies.clear();
  bodies.set(k, body);
  return body;
}

async function liveVersion(base: LessonVersion | undefined): Promise<LessonVersion | undefined> {
  if (!base) return base;
  try {
    const hash = (await liveHashes())?.get(base.lessonId);
    if (!hash || hash === base.hash) return base;
    const body = await storedBody(base.lessonId, hash);
    return body ? { ...base, hash, body, minutes: body.minutes ?? base.minutes } : base;
  } catch (e) {
    console.warn("content: live version of", base.lessonId, "unavailable", (e as Error).message);
    return base;
  }
}

export const getLessonVersion = async (lessonId: string) => liveVersion(await compiled.getLessonVersion(lessonId));
export const getBank = async (unitId: string) => liveVersion(await compiled.getBank(unitId));
