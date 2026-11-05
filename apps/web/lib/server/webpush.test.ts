import { describe, expect, it, beforeAll } from "vitest";
import { b64u, encryptPayload, fromB64u, vapidAuth } from "./webpush";

// Decrypts as a browser would (RFC 8291), to prove the payload format end to end.
async function hmac(key: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
const cat = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
const enc = new TextEncoder();

describe("web push", () => {
  let ua: CryptoKeyPair;
  let uaPublic: Uint8Array<ArrayBuffer>;
  const auth = crypto.getRandomValues(new Uint8Array(16));
  beforeAll(async () => {
    ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
    const vapid = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    process.env.VAPID_PUBLIC_KEY = b64u(await crypto.subtle.exportKey("raw", vapid.publicKey));
    process.env.VAPID_PRIVATE_KEY = (await crypto.subtle.exportKey("jwk", vapid.privateKey)).d!;
  });

  it("encrypts a payload the browser can read (aes128gcm)", async () => {
    const body = await encryptPayload({ endpoint: "https://push.example/x", p256dh: b64u(uaPublic), auth: b64u(auth) }, enc.encode('{"title":"Hi"}'));
    const salt = body.slice(0, 16);
    const idlen = body[20];
    const asPublic = body.slice(21, 21 + idlen);
    const cipher = body.slice(21 + idlen);
    const asKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, ua.privateKey, 256));
    const ikm = await hmac(await hmac(auth, ecdh), cat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])) as Uint8Array<ArrayBuffer>);
    const prk = await hmac(salt, ikm);
    const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])) as Uint8Array<ArrayBuffer>)).slice(0, 16);
    const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])) as Uint8Array<ArrayBuffer>)).slice(0, 12);
    const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, cipher));
    expect(plain[plain.length - 1]).toBe(2);
    expect(new TextDecoder().decode(plain.slice(0, -1))).toBe('{"title":"Hi"}');
  });

  it("signs a VAPID token for the push service's origin", async () => {
    const h = await vapidAuth("https://fcm.googleapis.com/fcm/send/abc", Date.UTC(2026, 10, 5));
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h)!;
    expect(m).toBeTruthy();
    const claims = JSON.parse(new TextDecoder().decode(fromB64u(m[2])));
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    expect(claims.sub).toBe("mailto:support@uxgate.org");
    const pub = await crypto.subtle.importKey("raw", fromB64u(m[4]), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, fromB64u(m[3]), enc.encode(`${m[1]}.${m[2]}`));
    expect(ok).toBe(true);
  });
});
