
// Service Worker for caching and offline functionality
const CACHE_NAME = 'algotouch-cache-v1';
const RUNTIME_CACHE = 'algotouch-runtime-v1';

// Resources to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/favicon.ico',
  '/placeholder.svg',
];

// Install handler
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate handler - clean up old caches
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
      })
      .then(cachesToDelete => {
        return Promise.all(cachesToDelete.map(cacheToDelete => {
          return caches.delete(cacheToDelete);
        }));
      })
      .then(() => self.clients.claim())
  );
});

// Fetch handler with cache strategies
self.addEventListener('fetch', event => {
  // Skip cross-origin requests and supabase API calls
  if (
    !event.request.url.startsWith(self.location.origin) || 
    event.request.url.includes('supabase') ||
    event.request.url.includes('cardcom')
  ) {
    return;
  }

  // For HTML pages - network first, then cache
  if (event.request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For images - cache first, then network
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // Update cache in background
          fetch(event.request).then(response => {
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(event.request, response.clone());
            });
          }).catch(() => {/* ignore errors */});
          return cachedResponse;
        }
        
        // If not in cache, fetch from network and cache
        return fetch(event.request).then(response => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        }).catch(() => {
          // Fallback for images
          return new Response('', {
            status: 404,
            statusText: 'Image not available'
          });
        });
      })
    );
    return;
  }

  // For scripts and CSS - stale-while-revalidate
  if (
    event.request.destination === 'script' || 
    event.request.destination === 'style'
  ) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });
        
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default strategy - network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Don't cache 4xx or 5xx responses
        if (!response.ok) {
          return response;
        }
        
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Background sync for failed API requests
self.addEventListener('sync', event => {
  if (event.tag === 'apiSync') {
    event.waitUntil(
      // Process failed requests here
      self.registration.getSync()
    );
  }
});
