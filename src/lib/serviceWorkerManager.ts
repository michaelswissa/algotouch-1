
/**
 * Service Worker registration and management
 */

import { checkCriticalModules } from './moduleLoader';

/**
 * Register the service worker with appropriate error handling
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers are not supported in this browser');
    return;
  }
  
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
    
    return registration;
  } catch (error) {
    console.error('ServiceWorker registration failed:', error);
    throw error;
  }
}

/**
 * Setup controller change listener for service worker updates
 */
export function setupServiceWorkerUpdates(): void {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('Service worker controller changed, reloading for latest version');
      window.location.reload();
    }
  });
}

/**
 * Check for service worker updates on a schedule
 * @param intervalMs Interval in milliseconds between checks
 */
export function setupPeriodicUpdateChecks(intervalMs = 60000): void {
  setInterval(() => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_UPDATES'
      });
    }
  }, intervalMs);
}
