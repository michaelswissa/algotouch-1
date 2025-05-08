
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import MySubscriptionPage from './pages/MySubscriptionPage';
import { AuthProvider } from './contexts/auth';
import { SubscriptionProvider } from './contexts/subscription/SubscriptionContext';
import CardcomRedirectPage from './pages/CardcomRedirectPage';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

// Lazy load the Dashboard component
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// Loading component for suspense fallback
const LoadingPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="h-12 w-12 rounded-full border-4 border-t-primary animate-spin"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <GlobalErrorBoundary>
          <Routes>
            <Route path="/" element={
              <Suspense fallback={<LoadingPage />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="/profile" element={<Profile />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/my-subscription" element={<MySubscriptionPage />} />
            <Route path="/cardcom-redirect" element={<CardcomRedirectPage />} />
            <Route path="*" element={
              <Suspense fallback={<LoadingPage />}>
                <Dashboard />
              </Suspense>
            } />
          </Routes>
        </GlobalErrorBoundary>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
