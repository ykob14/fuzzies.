// Fuzzies offline support: the app shell and fonts are cached so it opens without a connection.
const CACHE = 'fuzzies-v3';
// your chosen app icon (drawn by the app, see src/core/appicon.ts) — kept across updates
const ICON_CACHE = 'fuzzies-icon';
const ICON_FILES = /\/(icon\.svg|icon-192\.png|icon-512\.png|icon-maskable-512\.png|apple-touch-icon\.png)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './splash-fuzzy.svg'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== ICON_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;
  if (url.pathname.includes('/api/')) return; // accounts & sync always go to the server
  if (url.origin === location.origin && ICON_FILES.test(url.pathname)) {
    e.respondWith(caches.open(ICON_CACHE).then((c) => c.match(req)).then((hit) => hit || caches.match(req)).then((hit) => hit || fetch(req)));
    return;
  }
  // "is there a new version?" checks always ask the server (never answered from the cache)
  if (req.cache === 'no-store') return;
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    // network first for pages so updates show up, cache as fallback offline
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; }).catch(() => caches.match('./index.html')));
    return;
  }
  // cache first for hashed build assets and fonts
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
