// Lesson files (public/c/) hold answer keys and paid units. They sit in the static assets only so the server can read
// them through the ASSETS binding without putting them in the Worker's code; nobody may fetch them directly.
// wrangler.jsonc sends /c/* to the Worker first (run_worker_first), cf-worker.ts answers 404, and middleware.ts does the
// same under Node. The server's own ASSETS.fetch does not go through the Worker, so it still reads them.
export const PRIVATE_CONTENT_PREFIX = "/c/";
export const isPrivateContent = (pathname: string) => pathname.startsWith(PRIVATE_CONTENT_PREFIX);
export const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain", "cache-control": "no-store" } });
