/**
 * Module loader utility with retry and diagnostic capabilities
 */

// Keep track of module loading attempts
type ModuleLoadingState = {
  url: string;
  attempts: number;
  lastAttempt: number;
  error?: Error;
};

const loadingState: Record<string, ModuleLoadingState> = {};
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries

// Add version parameter to URLs to bust cache
const addVersionParam = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
};

/**
 * Load a module with retry logic
 */
export const loadModuleWithRetry = async <T>(
  importFn: () => Promise<T>,
  moduleName: string
): Promise<T> => {
  try {
    return await importFn();
  } catch (error) {
    console.error(`Failed to load module: ${moduleName}`, error);
    
    if (!loadingState[moduleName]) {
      loadingState[moduleName] = {
        url: '',
        attempts: 0,
        lastAttempt: Date.now()
      };
    }
    
    const state = loadingState[moduleName];
    state.attempts += 1;
    state.lastAttempt = Date.now();
    state.error = error as Error;
    
    // Extract URL from error message if available
    const urlMatch = (error as Error).message.match(/https?:\/\/[^'\s]+\.js/);
    if (urlMatch) {
      state.url = urlMatch[0];
    }
    
    if (state.attempts <= MAX_RETRIES) {
      console.log(`Retrying ${moduleName} load (attempt ${state.attempts}/${MAX_RETRIES})...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Try to clear browser cache for this URL
      if (state.url && 'caches' in window) {
        try {
          const cache = await caches.open('module-cache');
          await cache.delete(state.url);
          console.log(`Cache cleared for ${state.url}`);
        } catch (cacheError) {
          console.warn('Failed to clear cache:', cacheError);
        }
      }
      
      // Add version parameter to bust cache
      if (typeof window !== 'undefined') {
        window.__VITE_TIMESTAMP__ = Date.now();
      }
      
      // Retry the import
      return loadModuleWithRetry(importFn, moduleName);
    }
    
    console.error(`Failed to load ${moduleName} after ${MAX_RETRIES} attempts`);
    throw error;
  }
};

// Health check function for critical modules
export const checkCriticalModules = async (): Promise<boolean> => {
  try {
    // List of critical module paths relative to base URL
    const criticalModules = [
      './assets/index.js',
      './assets/vendor-react.js',
      './assets/ui-components.js'
    ];
    
    const baseUrl = window.location.origin;
    const results = await Promise.all(
      criticalModules.map(async (module) => {
        try {
          const response = await fetch(`${baseUrl}/${module}`, { 
            method: 'HEAD',
            cache: 'no-cache'
          });
          return response.ok;
        } catch {
          return false;
        }
      })
    );
    
    return results.every(result => result === true);
  } catch (error) {
    console.error('Critical module health check failed:', error);
    return false;
  }
};
