// Service Worker — caches app shell so it works offline and loads instantly.
// Bump CACHE_VERSION whenever you ship updated files.

const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `migraine-tracker-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './js/app.js',
  './js/state.js',
  './js/db.js',
  './js/constants.js',
  './js/utils.js',
  './js/views/today.js',
  './js/views/history.js',
  './js/views/settings.js',
  './js/views/migraine-editor.js',
  './js/views/prodrome.js',
  './js/views/check-in.js',
  './js/views/charts.js',
  './js/components/ui.js',
  './js/weather.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

// Install: pre-cache the shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: nuke old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell, network-first for weather API.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Weather API — always fresh, fall back to nothing if offline
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // App shell — cache first, network fallback, refresh cache on success
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
