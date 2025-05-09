
// Enhanced service worker for caching and error recovery

// Cache name with version
const CACHE_NAME = 'algotouch-cache-v2';

// Files to cache - include Auth component and related files
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index.css',
  // Main chunks
  '/assets/index.js',
  '/assets/vendor.js',
  '/assets/Auth.js',
  '/assets/pages.js',
  '/assets/auth.js',
  // Critical UI components
  '/favicon.ico',
];

// Install the service worker and cache initial assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell and content');
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Enhanced fetch handler with preload for critical modules
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip non-HTTP(S) requests and browser extensions
  if (!event.request.url.startsWith('http')) return;
  
  // Skip analytics and API endpoints
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/functions/')) return;
  
  // Special handling for JavaScript files and Auth module
  if (event.request.url.endsWith('.js') || 
      event.request.url.includes('/assets/Auth') ||
      event.request.url.includes('/assets/pages')) {
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
          console.log('Service Worker: Serving from cache after network failure:', event.request.url);
          // If network fetch fails, try to get from cache
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If not in cache either, return a simple fallback for JS files
            if (event.request.url.endsWith('.js')) {
              return new Response('console.warn("Module load failed, triggering app reload");setTimeout(()=>window.location.reload(),2000);', {
                headers: { 'Content-Type': 'application/javascript' }
              });
            }
          });
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

// Enhanced module recovery logic
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'RETRY_FAILED_MODULES') {
    console.log('Service Worker: Attempting to recover failed modules', event.data.modules);
    // Attempt to prefetch critical modules that failed to load
    const moduleUrls = event.data.modules || [];
    
    // Invalidate cache for these modules first
    caches.open(CACHE_NAME).then((cache) => {
      moduleUrls.forEach(url => {
        cache.delete(url).then(() => console.log('Cache invalidated for:', url));
      });
      
      // Then try to fetch fresh copies
      Promise.all(
        moduleUrls.map(url => 
          fetch(url, { cache: 'reload' })
            .then(response => {
              if (response.ok) {
                cache.put(url, response);
                console.log('Module recovered successfully:', url);
                return true;
              }
              console.log('Module recovery failed:', url);
              return false;
            })
            .catch(() => {
              console.log('Module fetch failed completely:', url);
              return false;
            })
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

// Preload critical resources in the background
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Try to preload Auth component and related assets
      return cache.addAll([
        '/assets/Auth.js',
        '/assets/auth.js',
        '/assets/pages.js'
      ]).catch(err => console.warn('Preload failed, will retry on demand:', err));
    })
  );
});
