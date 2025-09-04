const CACHE_NAME = 'aethernote-cache-v8.1-modular'; // IMPORTANT: Version is incremented
const URLS_TO_CACHE = [
  './',
  './index.html',
  './themes.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/styles.css',
  './js/app.js',
  './js/ui.js',
  './js/theme-engine.js',
  './js/state.js',
  './js/icons.js',
  './js/utils.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap'
];

// Install: Caches core assets and tells the worker to activate immediately.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching new app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Cleans up old caches from previous versions.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Serves assets from cache, falling back to network (cache-first for reliability)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          networkResponse => {
            return networkResponse;
          }
        );
      })
  );
});
