
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeErrorHandler } from './lib/errorHandler';
import { checkCriticalModules } from './lib/moduleLoader';
import { ThemeProvider } from 'next-themes';

// Initialize global error handler
initializeErrorHandler();

// Cache buster timestamp for all dynamic imports
window.__VITE_TIMESTAMP__ = Date.now();

// Enhanced service worker registration with failsafe mechanisms
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // First check if critical modules are available
      const modulesAvailable = await checkCriticalModules();
      if (!modulesAvailable) {
        console.warn('Critical modules health check failed, clearing caches');
        // Clear all caches if modules aren't available
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(
            cacheKeys.map(key => caches.delete(key))
          );
        }
      }
      
      // Try to unregister any existing service workers first to prevent conflicts
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('Unregistered previous service worker');
      }
      
      // Register fresh service worker with relative path
      const registration = await navigator.serviceWorker.register('./service-worker.js', {
        scope: './',
        updateViaCache: 'none' // Never use cache for the service worker itself
      });
      console.log('ServiceWorker registered with scope:', registration.scope);
      
      // Force update if needed
      if (registration.waiting) {
        console.log('New service worker waiting to activate');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Listen for new service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker installed and ready');
              // Force activation
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
      // Failsafe - add explicit error handling for service worker failure
      setupDirectFailsafe();
    }
  });
  
  // Handle controller changes (service worker updates)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('Service worker controller changed, reloading for latest version');
      window.location.reload();
    }
  });
}

// Direct failsafe for module loading (without service worker)
function setupDirectFailsafe() {
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('Failed to fetch dynamically imported module') ||
      event.message.includes('Loading chunk') ||
      event.message.includes('Loading CSS chunk')
    )) {
      console.error('Module loading error detected:', event.message);
      
      // Clear cache by appending a timestamp to requested URLs
      window.__VITE_TIMESTAMP__ = Date.now();
      console.log('Setting cache buster timestamp:', window.__VITE_TIMESTAMP__);
      
      // Extract module URL to detect which module failed
      const moduleUrl = event.message.match(/https?:\/\/[^'\s]+\.js/)?.[0] || '';
      const isDashboardModule = moduleUrl.includes('Dashboard') || 
                               window.location.pathname.includes('/dashboard');
      const isAuthModule = moduleUrl.includes('Auth') || 
                          window.location.pathname.includes('/auth');
      
      // Handle specific module failures
      if (isDashboardModule) {
        console.log('Dashboard module failed to load, redirecting to home page...');
        setTimeout(() => {
          window.location.href = `./?t=${window.__VITE_TIMESTAMP__}`;
        }, 1000);
      }
      else if (isAuthModule) {
        console.log('Auth module failed to load, redirecting to home page...');
        setTimeout(() => {
          window.location.href = `./?t=${window.__VITE_TIMESTAMP__}`;
        }, 1000);
      }
      else {
        // For other pages, just reload with cache buster
        setTimeout(() => {
          // Use relative paths consistently
          const path = window.location.pathname === '/' ? './' : '.' + window.location.pathname;
          window.location.href = `${path}?t=${window.__VITE_TIMESTAMP__}`;
        }, 1000);
      }
    }
  });
}

// Add TypeScript declaration for window object
declare global {
  interface Window {
    __VITE_TIMESTAMP__: number;
  }
}

// Prefetch critical modules immediately using relative paths
function prefetchCriticalModules() {
  try {
    const criticalModules = [
      './assets/index.js',
      './assets/vendor-react.js',
      './assets/ui-components.js'
    ];
    
    criticalModules.forEach(module => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'script';
      link.href = `${module}?v=${window.__VITE_TIMESTAMP__}`; // Add cache buster
      document.head.appendChild(link);
    });
    
    console.log('Prefetching critical modules');
  } catch (e) {
    console.warn('Failed to prefetch critical modules:', e);
  }
}

// Create root once and render the app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Check the index.html file.");
}

// Updated to use the next-themes ThemeProvider with dark mode as default
const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <App />
    </ThemeProvider>
  </StrictMode>
);

// Prefetch critical modules
prefetchCriticalModules();

// Add global catch for uncaught module loading errors
window.addEventListener('error', (event) => {
  if (event.message && (
    event.message.includes('Failed to fetch dynamically imported module') ||
    event.message.includes('Loading chunk') ||
    event.message.includes('Loading CSS chunk')
  )) {
    console.error('Module loading error detected:', event.message);
    
    // Attempt to recover via service worker if possible
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      const moduleUrl = event.message.match(/https?:\/\/[^'\s]+\.js/)?.[0];
      if (moduleUrl) {
        console.log('Asking service worker to retry failed module:', moduleUrl);
        navigator.serviceWorker.controller.postMessage({
          type: 'RETRY_FAILED_MODULES',
          modules: [moduleUrl]
        });
        
        // Listen for success/failure
        navigator.serviceWorker.addEventListener('message', (msgEvent) => {
          if (msgEvent.data?.type === 'MODULE_PREFETCH_RESULT') {
            if (msgEvent.data.success) {
              console.log('Module recovery successful, reloading...');
              window.location.reload();
            }
          }
        });
      }
    }
  }
});

// Check for updated resources periodically
setInterval(() => {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CHECK_UPDATES'
    });
  }
}, 60000); // Check every minute
