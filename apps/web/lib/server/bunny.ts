import "server-only";
import { createHash } from "node:crypto";

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * A signed Bunny Stream address for one video (HLS playlist), good for `ttlSeconds`. Bunny token authentication, directory token:
 * the signature covers the video's folder, so the playlist and every segment under it share one token.
 * Needs BUNNY_STREAM_CDN_HOST (the library's pull zone host) and BUNNY_STREAM_TOKEN_KEY (its token authentication key).
 */
export function signBunnyUrl(videoId: string, host: string, key: string, now = Date.now(), ttlSeconds = 7200): string {
  const expires = Math.floor(now / 1000) + ttlSeconds;
  const dir = `/${videoId}/`;
  const token = b64url(createHash("sha256").update(`${key}${dir}${expires}token_path=${dir}`).digest());
  return `https://${host}${dir}playlist.m3u8?token=${token}&expires=${expires}&token_path=${encodeURIComponent(dir)}`;
}

export const bunnyConfigured = () => !!process.env.BUNNY_STREAM_CDN_HOST && !!process.env.BUNNY_STREAM_TOKEN_KEY;
