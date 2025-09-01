const CACHE_NAME = 'aethernote-cache-v5.2';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './themes.json', // Single theme file
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap'
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
  );
  return self.clients.claim();
});

// Fetch: Serves assets from cache, falling back to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Handle theme file with network-first strategy
  if (event.request.url.includes('themes.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the theme file for offline use
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Handle Google Fonts
  if (event.request.url.includes('fonts.googleapis.com') || 
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) return response;
          
          return fetch(event.request).then(networkResponse => {
            // Cache the font response
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
            return networkResponse;
          });
        })
        .catch(() => {
          // Fallback to default font if both cache and network fail
          return new Response('body { font-family: system-ui, sans-serif; }', {
            headers: { 'Content-Type': 'text/css' }
          });
        })
    );
    return;
  }
  
  // For all other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});
