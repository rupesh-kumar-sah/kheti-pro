// KhetiSmart Service Worker v2
// Strategy:
//   - App shell (HTML/JS/CSS/icons): cache-first (instant loads)
//   - /api/* (own server): network-first with 3s timeout, fallback to cache
//   - Cross-origin: skip (handled by app)

const VERSION = 'v2.0.0';
const SHELL_CACHE = `khetismart-shell-${VERSION}`;
const API_CACHE   = `khetismart-api-${VERSION}`;
const API_TIMEOUT = 3000; // ms — fail fast to cached data

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: pre-cache shell assets ────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ─────────────────────────────────────
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

// ── Fetch handler ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin
  if (url.origin !== self.location.origin) return;

  // Skip Vite HMR in dev
  if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/@react-refresh')) return;

  // API: network-first with timeout for instant fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(req, API_CACHE, API_TIMEOUT));
    return;
  }

  // Shell assets: cache-first (instant load, background update)
  event.respondWith(cacheFirstWithUpdate(req, SHELL_CACHE));
});

// ── Cache-first + background revalidate (fastest for shell) ────────
async function cacheFirstWithUpdate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  
  // Background update (don't await)
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);

  if (cached) return cached;
  
  // No cache — wait for network
  const fresh = await networkPromise;
  return fresh || new Response('Offline', { status: 503 });
}

// ── Network-first with timeout (fast fail to cache) ────────────────
async function networkFirstWithTimeout(req, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const fresh = await fetch(req, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (fresh && fresh.ok) {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    // Timeout or network error — serve from cache
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}

// ── Message handler for skip waiting ───────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
