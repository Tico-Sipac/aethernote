const CACHE_NAME = 'aethernote-cache-v3'; // Incremented version for updates
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // Add paths to your icons here if they are essential for the offline experience
  './iicon-192.png',
  './icon-512.png'
];

// Install: Caches core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activate: Cleans up old caches
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
  );
  return self.clients.claim();
});

// Fetch: Serves assets from cache, falling back to network (Cache-first strategy)
self.addEventListener('fetch', event => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network.
        // We don't cache new requests here to keep the cache clean.
        // The cache is only populated on install.
        return fetch(event.request);
      })
    );
});

