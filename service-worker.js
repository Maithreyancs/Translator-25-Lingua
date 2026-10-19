/**
 * LinguaVoice - Offline Service Worker
 * Automatically caches all core frontend assets into CacheStorage
 * for 100% offline browser execution (air-gapped ready).
 */

const CACHE_NAME = 'linguavoice-offline-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './about.html',
  './history.html',
  './style.css',
  './components.css',
  './responsive.css',
  './languages.js',
  './translationService.js',
  './speech.js',
  './history.js',
  './favorites.js',
  './translator.js',
  './ui.js',
  './app.js',
  './vendor/transformers.min.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline app assets...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip Ollama live proxy endpoints
  if (url.pathname.startsWith('/api/ollama')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses for offline use
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for html pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
