
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeErrorHandler } from './lib/errorHandler';

// Initialize global error handler
initializeErrorHandler();

// Enhanced service worker registration with failsafe mechanisms
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Try to unregister any existing service workers first to prevent conflicts
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('Unregistered previous service worker');
      }
      
      // Register fresh service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
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
      if (typeof window.__VITE_TIMESTAMP__ === 'undefined') {
        window.__VITE_TIMESTAMP__ = Date.now();
        console.log('Setting cache buster timestamp:', window.__VITE_TIMESTAMP__);
      }
      
      // If on Auth page and Auth module fails, redirect to home
      if (window.location.pathname.includes('/auth')) {
        console.log('Auth module failed to load, redirecting to home page...');
        setTimeout(() => {
          window.location.href = '/?t=' + window.__VITE_TIMESTAMP__;
        }, 1000);
      }
      // If on Dashboard page and Dashboard module fails, redirect to home
      else if (window.location.pathname.includes('/dashboard')) {
        console.log('Dashboard module failed to load, redirecting to home page...');
        setTimeout(() => {
          window.location.href = '/?t=' + window.__VITE_TIMESTAMP__;
        }, 1000);
      }
      else {
        // For other pages, just reload with cache buster
        setTimeout(() => {
          window.location.href = window.location.pathname + '?t=' + window.__VITE_TIMESTAMP__;
        }, 1000);
      }
    }
  });
}

// Add TypeScript declaration for window object
declare global {
  interface Window {
    __VITE_TIMESTAMP__?: number;
  }
}

// Prefetch critical modules immediately
function prefetchCriticalModules() {
  try {
    // Prefetch Auth module
    const authLink = document.createElement('link');
    authLink.rel = 'prefetch';
    authLink.as = 'script';
    authLink.href = './assets/index.js'; // Main bundle should include Auth now with relative path
    document.head.appendChild(authLink);
    
    // Prefetch Dashboard module
    const dashboardLink = document.createElement('link');
    dashboardLink.rel = 'prefetch';
    dashboardLink.as = 'script'; 
    dashboardLink.href = './assets/index.js'; // Main bundle should include Dashboard now with relative path
    document.head.appendChild(dashboardLink);
    
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

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
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
        navigator.serviceWorker.controller.postMessage({
          type: 'RETRY_FAILED_MODULES',
          modules: [moduleUrl]
        });
      }
    }
  }
});
