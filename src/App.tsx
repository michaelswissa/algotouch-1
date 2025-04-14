import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';

import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import MySubscriptionPage from './pages/MySubscriptionPage';
import ProtectedRoute from './components/ProtectedRoute';
import SubscribedRoute from './components/SubscribedRoute';
import Subscription from './pages/Subscription';
import SubscriptionSuccess from './pages/SubscriptionSuccess';

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="theme-preference">
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/subscription/:planId" element={<Subscription />} />
            <Route path="/subscription-success" element={<SubscriptionSuccess />} />
            <Route path="/my-subscription" element={<MySubscriptionPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <SubscribedRoute>
                    <Dashboard />
                  </SubscribedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SubscribedRoute>
                    <Settings />
                  </SubscribedRoute>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster richColors position="top-center" />
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
