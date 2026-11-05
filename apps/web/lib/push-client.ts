// Push on this device (browser only). We ask once per device: after "Not now" or the browser's own answer, never again.
import { savePushSubscription, removePushSubscription } from "@/app/[locale]/app/(shell)/settings/actions";

export type PushState = "unsupported" | "on" | "off" | "blocked";
const ASKED_KEY = "ug-push-asked";
const vapidKey = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!vapidKey();
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

export function askedBefore(): boolean {
  try { return localStorage.getItem(ASKED_KEY) === "1"; } catch { return true; }
}
export function markAsked() {
  try { localStorage.setItem(ASKED_KEY, "1"); } catch { /* storage blocked: we may ask again next visit */ }
}

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const t = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Shows the browser's own prompt, then keeps the subscription on the server. */
export async function turnOnPush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  markAsked();
  const perm = await Notification.requestPermission();
  if (perm === "denied") return "blocked";
  if (perm !== "granted") return "off";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey()) }));
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "off";
  const r = await savePushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, userAgent: navigator.userAgent.slice(0, 300) });
  return r.ok ? "on" : "off";
}

export async function turnOffPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await removePushSubscription({ endpoint: sub.endpoint }).catch(() => null);
  await sub.unsubscribe().catch(() => false);
}
