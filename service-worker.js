const CACHE_NAME = "controle-ponto-v6";
const APP_FILES = [
  "./",
  "./index.html",
  "./controle-ponto.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const acceptsHtml = event.request.headers.get("accept")?.includes("text/html");
  const isNavigation = event.request.mode === "navigate" || acceptsHtml;

  if (isNavigation) {
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => (
        caches.match(event.request)
          .then(cached => cached || caches.match("./index.html"))
          .then(cached => cached || caches.match("./controle-ponto.html"))
      ))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});

self.addEventListener("push", event => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Controle de Ponto";
  const options = {
    body: payload.body || "Lembrete do Controle de Ponto.",
    icon: "./icon.svg",
    badge: "./icon.svg",
    data: {
      url: payload.url || "./"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "./", self.registration.scope).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(client => client.url.startsWith(self.registration.scope));
      if (existing) {
        existing.focus();
        return existing.navigate ? existing.navigate(targetUrl) : undefined;
      }
      return clients.openWindow(targetUrl);
    })
  );
});
