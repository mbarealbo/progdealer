// ProgDealer service worker — app shell + offline. Hand-rolled, no deps.
const CACHE = 'progdealer-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
const NAV_TIMEOUT = 3000; // ms — never let a slow/unreachable origin hold a navigation hostage.

// fetch() that gives up after `ms` so a hung TLS/connection can't block the page.
function fetchWithTimeout(request, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(request, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

self.addEventListener('install', (e) => {
  // Cache each shell entry independently so one failure can't abort the whole install.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((url) => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
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

  // SPA navigations: network-first but time-boxed — fall back to the cached shell fast
  // when the network is slow or the origin is unreachable (instead of hanging ~75s).
  if (request.mode === 'navigate') {
    e.respondWith(
      fetchWithTimeout(request, NAV_TIMEOUT)
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
