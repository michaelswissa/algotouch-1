
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeErrorHandler } from './lib/errorHandler';

// Initialize global error handler
initializeErrorHandler();

// Improved service worker registration with better error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      console.log('ServiceWorker registered with scope:', registration.scope);
      
      // Check if there's an available service worker to take over
      if (registration.waiting) {
        console.log('New service worker waiting to activate');
      }
      
      // Listen for new service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker installed and ready');
            }
          });
        }
      });
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
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

// Add global catch for uncaught module loading errors
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('Failed to fetch dynamically imported module')) {
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
