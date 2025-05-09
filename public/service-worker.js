
// Simple service worker for caching and error recovery

// Cache name with version
const CACHE_NAME = 'algotouch-cache-v1';

// Files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index.css',
  // Main chunks
  '/assets/index.js',
  '/assets/vendor.js',
  // Critical UI components
  '/favicon.ico',
  // Add other critical assets here
];

// Install the service worker and cache initial assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Try to serve from cache first, then network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip non-HTTP(S) requests and browser extensions
  if (!event.request.url.startsWith('http')) return;
  
  // Skip analytics and API endpoints
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/functions/')) return;
  
  // For JavaScript files, always fetch from network first
  if (event.request.url.endsWith('.js') || event.request.url.includes('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response to save it in cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // If network fetch fails, try to get from cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For all other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Return cached response
        }
        
        // Clone the request before using it (requests are one-time use)
        return fetch(event.request.clone())
          .then((response) => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response to save it in cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

// Handle recovery when offline
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'RETRY_FAILED_MODULES') {
    // Attempt to prefetch critical modules that failed to load
    const moduleUrls = event.data.modules || [];
    caches.open(CACHE_NAME).then((cache) => {
      Promise.all(
        moduleUrls.map(url => 
          fetch(url)
            .then(response => {
              if (response.ok) {
                cache.put(url, response);
                return true;
              }
              return false;
            })
            .catch(() => false)
        )
      ).then(results => {
        if (event.source) {
          // Notify the client about the prefetch results
          event.source.postMessage({
            type: 'MODULE_PREFETCH_RESULT',
            success: results.some(r => r === true)
          });
        }
      });
    });
  }
});
