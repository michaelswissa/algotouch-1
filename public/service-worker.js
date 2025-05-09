
// Enhanced service worker for caching and error recovery

// Cache name with version - increment this to force cache busting
const CACHE_NAME = 'algotouch-cache-v3';

// Critical files to cache - prioritize Auth component
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
  // Explicitly include Auth in the initial cache
  '/auth',
];

// Install the service worker and cache initial assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Force activation without waiting
  self.skipWaiting();
  
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
  // Take control immediately
  event.waitUntil(clients.claim());
  
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

// Network-first strategy for JavaScript modules
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip non-HTTP(S) requests and browser extensions
  if (!event.request.url.startsWith('http')) return;
  
  // Skip analytics and API endpoints
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/functions/')) return;
  
  // For Auth module and JS files, use network-first strategy
  if (event.request.url.includes('Auth') || 
      event.request.url.endsWith('.js') || 
      event.request.url.includes('/assets/')) {
    
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
          console.log('Service Worker: Falling back to cache for:', event.request.url);
          // If network fetch fails, try to get from cache
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If not in cache either, return a special fallback for Auth module
            if (event.request.url.includes('Auth')) {
              return new Response(
                'console.error("Auth module failed to load; redirecting to base URL");' +
                'setTimeout(() => window.location.href = "/", 1000);', 
                {headers: { 'Content-Type': 'application/javascript' }}
              );
            }
            
            // For other JS files
            if (event.request.url.endsWith('.js')) {
              return new Response(
                'console.warn("Module load failed; reloading app");' +
                'setTimeout(() => window.location.reload(), 1000);', 
                {headers: { 'Content-Type': 'application/javascript' }}
              );
            }
          });
        })
    );
    return;
  }
  
  // For HTML navigation requests (routes), use cache-first for speed
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) {
            return caches.match('/');
          }
          return response;
        })
        .catch(() => caches.match('/'))
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
        
        return fetch(event.request.clone())
          .then((response) => {
            if(!response || response.status !== 200) {
              return response;
            }
            
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

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'RETRY_FAILED_MODULES') {
    console.log('Service Worker: Attempting to recover failed modules', event.data.modules);
    const moduleUrls = event.data.modules || [];
    
    // First, invalidate cache for these modules
    caches.open(CACHE_NAME).then((cache) => {
      moduleUrls.forEach(url => {
        cache.delete(url).then(() => console.log('Cache invalidated for:', url));
      });
      
      // Then fetch fresh copies
      Promise.all(
        moduleUrls.map(url => 
          fetch(url, { 
            cache: 'reload',
            mode: 'no-cors', // Try to bypass CORS issues
            credentials: 'include' // Include credentials if needed
          })
            .then(response => {
              if (response.ok || response.type === 'opaque') {
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

// Preload Auth component in the background
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Prefetch Auth related assets
      return fetch('/auth', {
        mode: 'no-cors',
        credentials: 'include'
      })
      .then(response => {
        return cache.put('/auth', response);
      })
      .catch(err => console.warn('Auth prefetch failed, will retry on demand:', err));
    })
  );
});

