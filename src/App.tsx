
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/auth';
import { Spinner } from '@/components/ui/spinner';

// Import all components directly to avoid lazy loading issues
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SubscribedRoute from './components/SubscribedRoute';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import MySubscriptionPage from './pages/MySubscriptionPage';
import IframePaymentPage from './pages/IframePaymentPage';
import CardComRedirectPage from './pages/CardComRedirectPage';
import PaymentRedirectPage from './pages/PaymentRedirectPage';
import SubscriptionSuccess from './components/subscription/SubscriptionSuccess';
import SubscriptionFailed from './components/subscription/SubscriptionFailed';
import MonthlyReport from './pages/MonthlyReport';
import NotFound from './pages/NotFound';
import Blog from './pages/Blog';
import Calendar from './pages/Calendar';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminRoute from './components/AdminRoute';

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
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/subscription/success" element={<SubscriptionSuccess />} />
                <Route path="/subscription/failed" element={<SubscriptionFailed />} />
                
                {/* Payment routes */}
                <Route path="/payment/iframe/:planId" element={<IframePaymentPage />} />
                <Route path="/payment/redirect" element={<CardComRedirectPage />} />
                <Route path="/payment-redirect-success.html" element={<PaymentRedirectPage />} />
                <Route path="/payment-redirect-failed.html" element={<PaymentRedirectPage />} />
                <Route path="/cardcom-redirect" element={<CardComRedirectPage />} />
                <Route path="/payment/:planId?" element={<IframePaymentPage />} />
                
                {/* Protected routes - require authentication */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-subscription"
                  element={
                    <ProtectedRoute>
                      <MySubscriptionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                
                {/* Routes that require subscription */}
                <Route
                  path="/monthly-report"
                  element={
                    <SubscribedRoute>
                      <MonthlyReport />
                    </SubscribedRoute>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <SubscribedRoute>
                      <Calendar />
                    </SubscribedRoute>
                  }
                />
                <Route
                  path="/blog"
                  element={
                    <SubscribedRoute>
                      <Blog />
                    </SubscribedRoute>
                  }
                />
                <Route
                  path="/courses"
                  element={
                    <SubscribedRoute>
                      <Courses />
                    </SubscribedRoute>
                  }
                />
                <Route
                  path="/courses/:courseId"
                  element={
                    <SubscribedRoute>
                      <CourseDetail />
                    </SubscribedRoute>
                  }
                />
                
                {/* Admin route */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />
                
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
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
