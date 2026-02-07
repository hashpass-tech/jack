/**
 * JACK Landing – Service Worker
 * Cache-first for videos & fonts, stale-while-revalidate for assets.
 * Dramatically improves repeat-visit & mobile performance.
 */

const CACHE_VERSION = 'jack-v1';
const VIDEO_CACHE = 'jack-videos-v1';
const ASSET_CACHE = 'jack-assets-v1';
const FONT_CACHE = 'jack-fonts-v1';

/* ── Assets to pre-cache on install (critical V2 videos are small) ── */
const PRECACHE_URLS = [
  '/',
  '/videos/scene1-key-management.webm',
  '/videos/scene2-multi-chain.webm',
  '/videos/scene3-clearing.webm',
  '/videos/scene4-automation.webm',
];

/* ── Install: pre-cache critical assets ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSET_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate: clean up old caches ── */
self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_VERSION, VIDEO_CACHE, ASSET_CACHE, FONT_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !keepCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch strategy ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Video files → Cache-first (they never change per version)
  if (url.pathname.startsWith('/videos/')) {
    event.respondWith(cacheFirst(request, VIDEO_CACHE));
    return;
  }

  // Google Fonts → Cache-first with long TTL
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // Images & static assets → Cache-first
  if (/\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // JS/CSS bundles → Stale-while-revalidate (allows instant load + background update)
  if (/\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // HTML / everything else → Network-first
  event.respondWith(networkFirst(request, CACHE_VERSION));
});

/* ── Cache-first: return cached or fetch & cache ── */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

/* ── Stale-while-revalidate: return cached immediately, update in background ── */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

/* ── Network-first: try network, fall back to cache ── */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 503, statusText: 'Offline' });
  }
}
