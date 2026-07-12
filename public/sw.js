// ProgDealer service worker — app shell + offline. Hand-rolled, no deps.
const CACHE = 'progdealer-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Let cross-origin (Supabase, Google auth, analytics, map tiles) go straight to the network.
  if (url.origin !== self.location.origin) return;

  // SPA navigations: network-first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/index.html', copy)); return res; })
        .catch(() => caches.match(request).then((m) => m || caches.match('/index.html')))
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  e.respondWith(
    caches.match(request).then((cached) => {
      const net = fetch(request)
        .then((res) => { if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); } return res; })
        .catch(() => cached);
      return cached || net;
    })
  );
});
