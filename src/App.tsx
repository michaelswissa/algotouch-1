
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/auth';
import { Spinner } from '@/components/ui/spinner';

// Eagerly load the Index page and ProtectedRoute for initial rendering
import Index from './pages/Index';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load other pages that aren't needed immediately
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Subscription = lazy(() => import('./pages/Subscription'));
const MySubscriptionPage = lazy(() => import('./pages/MySubscriptionPage'));
const IframePaymentPage = lazy(() => import('./pages/IframePaymentPage'));
const CardComRedirectPage = lazy(() => import('./pages/CardComRedirectPage'));
const SubscriptionSuccess = lazy(() => import('./components/subscription/SubscriptionSuccess'));
const SubscriptionFailed = lazy(() => import('./components/subscription/SubscriptionFailed'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner className="h-8 w-8" />
  </div>
);

// Create QueryClient with correct configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (renamed from cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <div className="App">
      <ThemeProvider defaultTheme="dark" storageKey="theme-preference">
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={
                  <Suspense fallback={<PageLoader />}>
                    <Auth />
                  </Suspense>
                } />
                <Route path="/subscription" element={
                  <Suspense fallback={<PageLoader />}>
                    <Subscription />
                  </Suspense>
                } />
                <Route path="/subscription/success" element={
                  <Suspense fallback={<PageLoader />}>
                    <SubscriptionSuccess />
                  </Suspense>
                } />
                <Route path="/subscription/failed" element={
                  <Suspense fallback={<PageLoader />}>
                    <SubscriptionFailed />
                  </Suspense>
                } />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}>
                        <Settings />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-subscription"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}>
                        <MySubscriptionPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route path="/payment/iframe/:planId" element={
                  <Suspense fallback={<PageLoader />}>
                    <IframePaymentPage />
                  </Suspense>
                } />
                <Route path="/payment/redirect" element={
                  <Suspense fallback={<PageLoader />}>
                    <CardComRedirectPage />
                  </Suspense>
                } />
              </Routes>
              <Toaster richColors position="top-center" />
            </AuthProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;
