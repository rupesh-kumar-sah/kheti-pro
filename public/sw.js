// KhetiSmart Service Worker
// Enables offline support and faster repeat loads.
// Strategy:
//   - App shell (HTML/JS/CSS/fonts/icons): stale-while-revalidate
//   - /api/* (own server): network-first with short cache fallback
//   - Gemini & external APIs: bypass (handled by app-level localStorage cache)

const VERSION = 'v1.0.0';
const SHELL_CACHE = `khetismart-shell-${VERSION}`;
const API_CACHE = `khetismart-api-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin requests (Gemini, weather, fonts CDN, Tailwind CDN, etc.)
  // Those are either cached at the app layer or we always want fresh.
  if (url.origin !== self.location.origin) return;

  // Don't intercept Vite HMR / dev websockets
  if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/@react-refresh')) return;

  // API: network-first, fall back to cache for resilience
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(req, API_CACHE));
    return;
  }

  // Everything else (HTML, JS, CSS, icons): stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
});

async function networkFirst(req, cacheName) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

// Allow the page to trigger an immediate activation after a new SW is installed
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
