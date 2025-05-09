
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isModuleError: boolean;
  isAuthError: boolean;
  isDashboardError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isModuleError: false,
      isAuthError: false,
      isDashboardError: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a module loading error
    const isModuleError = error.message && 
      (error.message.includes('Failed to fetch dynamically imported module') ||
       error.message.includes('Importing a module script failed') ||
       error.message.includes('Loading chunk'));
    
    // Check if it's specifically the Auth module
    const isAuthError = error.message && 
      error.message.includes('Auth-') && 
      error.message.includes('Failed to fetch');
       
    // Check if it's specifically the Dashboard module
    const isDashboardError = error.message && 
      error.message.includes('Dashboard-') && 
      error.message.includes('Failed to fetch');
       
    return {
      hasError: true,
      error,
      isModuleError,
      isAuthError,
      isDashboardError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Uncaught error:", error, errorInfo);
    
    // Special handling for Auth module errors
    if (this.state.isAuthError) {
      console.log('Auth module failed to load, redirecting to home...');
      // Delay to allow logging to complete
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      return;
    }
    
    // Special handling for Dashboard module errors
    if (this.state.isDashboardError) {
      console.log('Dashboard module failed to load, redirecting to home...');
      // Delay to allow logging to complete
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      return;
    }
    
    // Try to recover from module loading errors
    if (this.state.isModuleError && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const moduleUrl = this.extractModuleUrl(error.message);
      if (moduleUrl) {
        console.log('Attempting to recover module:', moduleUrl);
        navigator.serviceWorker.controller.postMessage({
          type: 'RETRY_FAILED_MODULES',
          modules: [moduleUrl]
        });
        
        // Set up a listener for when the service worker responds
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'MODULE_PREFETCH_RESULT') {
            if (event.data.success) {
              console.log('Module recovery successful, reloading...');
              window.location.reload();
            } else if (this.state.isAuthError || this.state.isDashboardError) {
              // If critical module recovery failed, redirect to home
              window.location.href = '/';
            }
          }
        });
      }
    }
  }

  // Extract module URL from error message
  extractModuleUrl(message: string): string | null {
    const matches = message.match(/https?:\/\/[^'\s]+\.js/);
    return matches ? matches[0] : null;
  }

  // Custom retry logic
  handleRetry = () => {
    if (this.state.isAuthError || this.state.isDashboardError) {
      // For critical module errors, go to homepage
      window.location.href = '/';
    } else if (this.state.isModuleError) {
      console.log('Manual retry triggered, clearing cache and reloading...');
      
      // Clear browser cache for this domain (if supported)
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName).then(() => {
              console.log('Cache deleted:', cacheName);
            });
          });
        });
      }
      
      // Force reload bypassing cache
      window.location.reload();
    } else {
      // Simple reload for other errors
      window.location.reload();
    }
  };
  
  // Go to homepage bypassing Auth
  handleGoHome = () => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI for Auth module errors
      if (this.state.isAuthError) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-6 text-orange-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">שגיאה בטעינת עמוד ההתחברות</h2>
            <p className="text-muted-foreground mb-4">
              אירעה שגיאה בטעינת עמוד ההתחברות. אנו מפנים אותך לעמוד הראשי.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                חזור לעמוד הבית
              </button>
            </div>
          </div>
        );
      }
      
      // Custom fallback UI for Dashboard module errors
      if (this.state.isDashboardError) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-6 text-orange-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">שגיאה בטעינת לוח הבקרה</h2>
            <p className="text-muted-foreground mb-4">
              אירעה שגיאה בטעינת לוח הבקרה. אנו מפנים אותך לעמוד הראשי.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                חזור לעמוד הבית
              </button>
            </div>
          </div>
        );
      }
      
      // Custom fallback UI for module loading errors
      if (this.state.isModuleError) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-6 text-orange-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">שגיאה בטעינת מודול האפליקציה</h2>
            <p className="text-muted-foreground mb-4">
              אירעה שגיאה בטעינת רכיבי האפליקציה. אנו מנסים לפתור את הבעיה באופן אוטומטי.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              אם הבעיה נמשכת, אנא נסה את האפשרויות הבאות:
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                נסה שוב
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                חזור לעמוד הבית
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                נקה מטמון ונסה שוב
              </button>
            </div>
          </div>
        );
      }
    
      // Fallback UI for other errors
      return this.props.fallback || (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <div className="mb-6 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">משהו השתבש</h2>
          <p className="text-muted-foreground mb-4">
            אירעה שגיאה בטעינת האפליקציה
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            רענן את הדף
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
