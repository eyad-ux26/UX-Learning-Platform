// The push services browsers really use. A subscription to any other host is refused when saved and never sent to,
// so a learner cannot make the server send requests to an address of their choosing.
const EXACT = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]);
const SUFFIX = [".notify.windows.com", ".push.apple.com"];

export function isPushEndpoint(endpoint: string): boolean {
  let u: URL;
  try { u = new URL(endpoint); } catch { return false; }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
  const host = u.hostname.toLowerCase();
  return EXACT.has(host) || SUFFIX.some((s) => host.endsWith(s) && host.length > s.length);
}
