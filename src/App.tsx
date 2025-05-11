
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { ThemeProvider } from '@/contexts/theme';
import { AuthProvider } from '@/contexts/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { loadModuleWithRetry } from '@/lib/moduleLoader';

// Eagerly loaded routes for critical paths
import Auth from '@/pages/Auth';

// Payment routes
const IframeRedirect = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/IframeRedirect'), 'IframeRedirect')
);
const PaymentSuccess = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/PaymentSuccess'), 'PaymentSuccess')
);
const PaymentFailed = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/PaymentFailed'), 'PaymentFailed')
);

// Lazy loaded routes
const Dashboard = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Dashboard'), 'Dashboard')
);
const Subscription = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Subscription'), 'Subscription')
);
const Community = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Community'), 'Community')
);
const Courses = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Courses'), 'Courses')
);
const CourseDetail = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/CourseDetail'), 'CourseDetail')
);
const Account = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Account'), 'Account')
);
const NotFound = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/NotFound'), 'NotFound')
);

// Loading component for Suspense
const LoadingPage = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Spinner size="lg" />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingPage />}>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Payment routes */}
              <Route path="/payment/redirect" element={<IframeRedirect />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failed" element={<PaymentFailed />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute>{/* Fixed by adding children element */}</ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/community" element={<Community />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:courseId" element={<CourseDetail />} />
                <Route path="/account" element={<Account />} />
              </Route>
              
              {/* Default & catch-all routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster richColors position="top-center" dir="rtl" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
