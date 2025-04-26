
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
import { RegistrationProvider } from './contexts/registration/RegistrationContext';

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="theme-preference">
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RegistrationProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/subscription/*"
                  element={
                    <ProtectedRoute requireAuth={true} allowRegistrationFlow={false}>
                      <Subscription />
                    </ProtectedRoute>
                  }
                />
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
              </Routes>
              <Toaster richColors position="top-center" />
            </RegistrationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
