
import React from 'react';
import { BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth/AuthProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import PageTransition from '@/components/PageTransition';
import { generateRouteComponents } from './routing/routes';
import ErrorBoundary from './components/ErrorBoundary';

// Add dark mode by default
document.documentElement.classList.add('dark');

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster position="top-center" richColors />
        <Router>
          <ErrorBoundary fallback={<div className="h-screen flex items-center justify-center">שגיאה בטעינת האפליקציה. נא לרענן את הדף.</div>}>
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
