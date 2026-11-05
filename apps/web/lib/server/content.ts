// Whole lessons for the server. Each lesson is a static file in public/c/ (copied from packages/content/dist/lessons
// at build time, named by a hash of its content). On Cloudflare the Worker reads it through its ASSETS binding, so the
// lessons are not part of the Worker's code; under Node (next dev / next start) it reads the file from disk.
import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createLessonLoader } from "@uxgate/content";

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

export const { getLessonVersion, getBank } = createLessonLoader(read);
