
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth/AuthProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import PageTransition from '@/components/PageTransition';
import { generateRouteComponents } from './routing/routes';
import ErrorBoundary from './components/ErrorBoundary';
import { moduleHealthMonitor } from './lib/moduleHealthCheck';

// Explicitly prefetch critical components
const prefetchCriticalComponents = () => {
  try {
    // Create prefetch links with relative paths
    const criticalPaths = [
      { path: './auth', type: 'document' },
      { path: './dashboard', type: 'document' },
      { path: './assets/index.js', type: 'script' },
      { path: './assets/vendor-react.js', type: 'script' },
      { path: './assets/ui-components.js', type: 'script' }
    ];
    
    criticalPaths.forEach(({ path, type }) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      if (type === 'script') link.as = 'script';
      
      // Add cache busting parameter
      const cacheBuster = window.__VITE_TIMESTAMP__ || Date.now();
      link.href = `${path}?v=${cacheBuster}`;
      
      document.head.appendChild(link);
    });
  } catch (e) {
    console.warn('Prefetch failed:', e);
  }
};

function App() {
  // Initialize module health monitoring
  useEffect(() => {
    moduleHealthMonitor.initialize();
    
    // Add dark mode by default
    document.documentElement.classList.add('dark');
    
    // Prefetch critical components
    prefetchCriticalComponents();
  }, []);
  
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster position="top-center" richColors />
        <Router>
          <ErrorBoundary fallback={
            <div className="h-screen flex flex-col items-center justify-center p-4">
              <div className="mb-6 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">שגיאה בטעינת האפליקציה</h2>
              <p className="text-muted-foreground mb-4">אירעה שגיאה בטעינת האפליקציה</p>
              <div className="flex gap-3">
                <button onClick={() => window.location.href = "./"} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
                  חזור לעמוד הראשי
                </button>
                <button onClick={() => {
                  // Clear caches before reload
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => {
                        caches.delete(name);
                      });
                    });
                  }
                  // Add timestamp to bust cache
                  const timestamp = Date.now();
                  window.location.href = `./?t=${timestamp}`;
                }} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors">
                  נקה מטמון ורענן
                </button>
              </div>
            </div>
          }>
            <PageTransition>
              <Routes>
                {generateRouteComponents()}
              </Routes>
            </PageTransition>
          </ErrorBoundary>
        </Router>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
