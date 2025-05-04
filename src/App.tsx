
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/auth';

import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import MySubscriptionPage from './pages/MySubscriptionPage';
import ProtectedRoute from './components/ProtectedRoute';
import IframePaymentPage from './pages/IframePaymentPage';
import SubscriptionSuccess from './components/subscription/SubscriptionSuccess';
import SubscriptionFailed from './components/subscription/SubscriptionFailed';

const queryClient = new QueryClient();

function App() {
  return (
    <div className="App">
      <ThemeProvider defaultTheme="dark" storageKey="theme-preference">
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/subscription/success" element={<SubscriptionSuccess />} />
                <Route path="/subscription/failed" element={<SubscriptionFailed />} />
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
                <Route path="/payment/iframe/:planId" element={<IframePaymentPage />} />
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
