/* UXGate service worker: push notifications and the offline page. Nothing else is cached, so pages and lessons always load fresh. */
const OFFLINE = "ug-offline-v1";
const PAGES = ["/en/offline", "/ar/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE).then((c) => c.addAll(PAGES)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Page loads go to the network; only when it cannot be reached do we show the offline page in the page's language.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate" || req.method !== "GET") return;
  event.respondWith(
    fetch(req).catch(async () => {
      const ar = new URL(req.url).pathname.startsWith("/ar");
      const cached = await caches.match(ar ? "/ar/offline" : "/en/offline");
      return cached || new Response("Offline", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
    }),
  );
});

self.addEventListener("push", (event) => {
  let msg = { title: "UXGate", body: "", url: "/", tag: "uxgate" };
  try { msg = Object.assign(msg, event.data ? event.data.json() : {}); } catch { /* not JSON: show the default */ }
  event.waitUntil(
    self.registration.showNotification(msg.title, { body: msg.body, tag: msg.tag, icon: "/brand/icon.svg", badge: "/brand/icon.svg", data: { url: msg.url } }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.startsWith(self.location.origin) && "focus" in c) { c.navigate(url.href); return c.focus(); }
      return self.clients.openWindow(url.href);
    }),
  );
});
