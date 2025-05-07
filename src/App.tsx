
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth/AuthProvider';

// Import your pages lazily to avoid circular dependencies
const Index = React.lazy(() => import('./pages/Index'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const MySubscriptionPage = React.lazy(() => import('./pages/MySubscriptionPage'));
const ContractDetails = React.lazy(() => import('./pages/ContractDetails'));

// Add a loading component for the suspense fallback
const LoadingPage = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
  </div>
);

// הוסף את ה-class dark ל-html כברירת מחדל בעת הטעינה הראשונית
document.documentElement.classList.add('dark');

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <Router>
        <React.Suspense fallback={<LoadingPage />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/my-subscription" element={<MySubscriptionPage />} />
            <Route path="/contract/:contractId" element={<ContractDetails />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<h1>Page not found</h1>} />
          </Routes>
        </React.Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
