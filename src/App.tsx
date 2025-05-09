
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth/AuthProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import PageTransition from '@/components/PageTransition';
import { generateRouteComponents } from './routing/routes';
import ErrorBoundary from './components/ErrorBoundary';

// Explicitly prefetch critical components
const prefetchCriticalComponents = () => {
  try {
    // Create prefetch links
    const authLink = document.createElement('link');
    authLink.rel = 'prefetch';
    authLink.href = '/auth';
    document.head.appendChild(authLink);
    
    const dashboardLink = document.createElement('link');
    dashboardLink.rel = 'prefetch';
    dashboardLink.href = '/dashboard';
    document.head.appendChild(dashboardLink);
    
    // Also try to prefetch the JS directly
    const scriptLink = document.createElement('link');
    scriptLink.rel = 'prefetch';
    scriptLink.as = 'script';
    scriptLink.href = '/assets/index.js'; // Main bundle should include Auth and Dashboard now
    document.head.appendChild(scriptLink);
  } catch (e) {
    console.warn('Prefetch failed:', e);
  }
};

function App() {
  // Add dark mode by default
  useEffect(() => {
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
                <button onClick={() => window.location.href = "/"} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
                  חזור לעמוד הראשי
                </button>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors">
                  רענן את הדף
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
