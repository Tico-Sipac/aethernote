const CACHE_NAME = 'aethernote-cache-v6'; // Note: Increased version to force update
const URLS_TO_CACHE = [
  './',

  './index.html',
  './themes.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap',
  'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2' // Caching the font file directly
];

// Install: Caches core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
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
    .then(() => self.clients.claim())
  );
});

// Fetch: Implements a Network-first, falling back to cache strategy for offline support
self.addEventListener('fetch', event => {
  // We only care about GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // For all GET requests, try the network first.
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If we get a valid response, clone it, cache it, and return it.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return networkResponse;
      })
      .catch(() => {
        // If the network request fails (user is offline), try to get it from the cache.
        return caches.match(event.request)
          .then(cachedResponse => {
            // If the request is in the cache, return the cached version.
            if (cachedResponse) {
              return cachedResponse;
            }

            // IMPORTANT: If the offline user is trying to open the app page itself,
            // and it's not in the cache for some reason, serve the main index.html file.
            // This is the key to making the PWA load offline.
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            // If the asset is not in the cache and the network is down, we can't do anything.
            return new Response("Content is not available offline.", {
              status: 404,
              statusText: "Not Found"
            });
          });
      })
  );
});
