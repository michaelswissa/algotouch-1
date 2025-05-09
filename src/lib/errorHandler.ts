// Global error handler for module loading issues and other runtime errors

type FailedModuleInfo = {
  url: string;
  timestamp: number;
  attempts: number;
};

// Keep track of failed modules
const failedModules: Record<string, FailedModuleInfo> = {};

// Maximum number of retry attempts
const MAX_RETRY_ATTEMPTS = 3;

// Initialize the error handler
export function initializeErrorHandler() {
  // Listen for unhandled errors
  window.addEventListener('error', (event) => {
    const error = event.error || {};
    const message = event.message || error.message || '';
    
    // Check if it's a module loading error
    if (message.includes('Failed to fetch dynamically imported module')) {
      const moduleUrl = extractModuleUrl(message);
      if (moduleUrl) {
        handleModuleLoadError(moduleUrl);
      }
    }
  });
  
  // Listen for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || '';
    
    // Check if it's a module loading error
    if (message.includes('Failed to fetch dynamically imported module')) {
      const moduleUrl = extractModuleUrl(message);
      if (moduleUrl) {
        handleModuleLoadError(moduleUrl);
      }
    }
  });
  
  // Listen for service worker messages
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'MODULE_PREFETCH_RESULT') {
        if (event.data.success) {
          // If successfully prefetched, reload the page
          window.location.reload();
        }
      }
    });
  }
}

// Extract module URL from error message
function extractModuleUrl(message: string): string | null {
  const matches = message.match(/https?:\/\/[^'\s]+\.js/);
  return matches ? matches[0] : null;
}

// Handle module load error
function handleModuleLoadError(moduleUrl: string) {
  if (!failedModules[moduleUrl]) {
    failedModules[moduleUrl] = {
      url: moduleUrl,
      timestamp: Date.now(),
      attempts: 0
    };
  }
  
  const moduleInfo = failedModules[moduleUrl];
  
  // Increment attempt counter
  moduleInfo.attempts += 1;
  moduleInfo.timestamp = Date.now();
  
  // If we haven't exceeded max attempts, try to recover
  if (moduleInfo.attempts <= MAX_RETRY_ATTEMPTS) {
    console.log(`Attempting to recover failed module (${moduleInfo.attempts}/${MAX_RETRY_ATTEMPTS}): ${moduleUrl}`);
    
    // Try to prefetch via service worker if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'RETRY_FAILED_MODULES',
        modules: [moduleUrl]
      });
    } else {
      // If no service worker, try direct fetch
      fetch(moduleUrl)
        .then(response => {
          if (response.ok) {
            // If successfully fetched, reload the page
            window.location.reload();
          }
        })
        .catch(err => {
          console.error('Failed to recover module:', err);
        });
    }
  } else {
    console.error(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached for module: ${moduleUrl}`);
    
    // Show a user-friendly error message
    const errorContainer = document.createElement('div');
    errorContainer.style.position = 'fixed';
    errorContainer.style.top = '0';
    errorContainer.style.left = '0';
    errorContainer.style.right = '0';
    errorContainer.style.padding = '20px';
    errorContainer.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
    errorContainer.style.color = 'white';
    errorContainer.style.textAlign = 'center';
    errorContainer.style.zIndex = '9999';
    
    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'אירעה שגיאה בטעינת האפליקציה. אנא רענן את הדף.';
    
    const reloadButton = document.createElement('button');
    reloadButton.textContent = 'רענן עכשיו';
    reloadButton.style.backgroundColor = 'white';
    reloadButton.style.color = '#dc2626';
    reloadButton.style.border = 'none';
    reloadButton.style.padding = '8px 16px';
    reloadButton.style.borderRadius = '4px';
    reloadButton.style.marginTop = '10px';
    reloadButton.style.cursor = 'pointer';
    reloadButton.onclick = () => window.location.reload();
    
    errorContainer.appendChild(errorMessage);
    errorContainer.appendChild(reloadButton);
    document.body.appendChild(errorContainer);
  }
}
