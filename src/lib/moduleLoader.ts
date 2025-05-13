
/**
 * Module loading and health check utilities for the application
 */

// Constants for module loading behavior
const MODULE_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;

/**
 * Checks if critical modules are available
 * @returns Promise<boolean> True if critical modules are available
 */
export async function checkCriticalModules(): Promise<boolean> {
  try {
    console.debug('Checking critical modules availability...');
    
    // List of critical module paths relative to base URL
    const criticalModules = [
      './assets/index.js',
      './assets/vendor-react.js',
      './assets/ui-components.js'
    ];
    
    const baseUrl = window.location.origin;
    const timestamp = window.location.search.includes('t=') 
      ? window.location.search.split('t=')[1].split('&')[0]
      : Date.now();
      
    // Check if all critical modules can be fetched
    const modulePromises = criticalModules.map(async (modulePath) => {
      const moduleUrl = `${baseUrl}/${modulePath}?v=${timestamp}`;
      try {
        const response = await fetchWithTimeout(moduleUrl, MODULE_TIMEOUT);
        return response.ok;
      } catch (error) {
        console.error(`Failed to load critical module: ${modulePath}`, error);
        return false;
      }
    });
    
    // Wait for all module checks to complete
    const results = await Promise.all(modulePromises);
    const allModulesAvailable = results.every(Boolean);
    
    console.debug(`Critical modules availability check: ${allModulesAvailable ? 'PASS' : 'FAIL'}`);
    return allModulesAvailable;
  } catch (error) {
    console.error('Error checking critical modules:', error);
    return false;
  }
}

/**
 * Prefetches critical modules to improve startup performance
 */
export function prefetchCriticalModules(): void {
  try {
    console.debug('Prefetching critical modules...');
    
    const criticalModules = [
      './assets/index.js',
      './assets/vendor-react.js',
      './assets/ui-components.js'
    ];
    
    // Add cache buster to avoid using stale cached versions
    const cacheBuster = `v=${window.__VITE_TIMESTAMP__ || Date.now()}`;
    
    criticalModules.forEach(module => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'script';
      link.href = `${module}?${cacheBuster}`;
      document.head.appendChild(link);
      
      console.debug(`Prefetching ${link.href}`);
    });
  } catch (error) {
    console.warn('Failed to prefetch critical modules:', error);
  }
}

/**
 * Handles module load errors by clearing cache and reloading
 * @param error The error that occurred during module loading
 */
export function handleModuleLoadError(error: Error | string): void {
  const errorStr = typeof error === 'string' ? error : error.message || 'Unknown module loading error';
  
  // Only handle module loading related errors
  const isModuleError = 
    errorStr.includes('Failed to fetch dynamically imported module') || 
    errorStr.includes('Loading chunk') || 
    errorStr.includes('Loading CSS chunk');
  
  if (!isModuleError) return;
  
  console.warn('Module loading error detected:', errorStr);
  
  // Clear cache by updating timestamp
  window.__VITE_TIMESTAMP__ = Date.now();
  
  // Get the current URL and add/update the timestamp parameter
  const url = new URL(window.location.href);
  url.searchParams.set('t', window.__VITE_TIMESTAMP__.toString());
  
  // Reload after a small delay
  setTimeout(() => {
    console.log('Reloading page with cache buster:', url.toString());
    window.location.href = url.toString();
  }, 1000);
}

/**
 * Fetch with timeout to avoid hanging requests
 * @param url URL to fetch
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise<Response> Fetch response
 */
function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timed out for ${url}`));
    }, timeoutMs);
    
    fetch(url, { signal: controller.signal })
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}

/**
 * Utility for dynamically importing modules with retry capability
 * @param importFn Import function to retry
 * @param moduleName Name of module for logging
 * @param retries Number of retries allowed
 * @returns Promise<any> The imported module
 */
export function importModuleWithRetry(
  importFn: () => Promise<any>,
  moduleName: string,
  retries: number = MAX_RETRIES
): Promise<any> {
  return new Promise((resolve, reject) => {
    const attempt = (attemptsLeft: number) => {
      console.debug(`Loading module: ${moduleName} (attempts left: ${attemptsLeft})`);
      
      importFn()
        .then(resolve)
        .catch(error => {
          console.error(`Error loading ${moduleName}:`, error);
          
          if (attemptsLeft > 0) {
            console.debug(`Retrying module load: ${moduleName}`);
            setTimeout(() => attempt(attemptsLeft - 1), 1000);
          } else {
            reject(error);
          }
        });
    };
    
    attempt(retries);
  });
}
