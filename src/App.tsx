import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import TradeReport from './pages/TradeReport';
import Subscription from './pages/Subscription';
import MySubscriptionPage from './pages/MySubscriptionPage';
import { AuthProvider } from './contexts/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from "@/components/ui/toaster"
import TransactionManagerPage from './components/payment/TransactionManagerPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster richColors position="top-center" />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/trade-report" element={<ProtectedRoute><TradeReport /></ProtectedRoute>} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/subscription/:planId" element={<Subscription />} />
          <Route path="/my-subscription" element={<MySubscriptionPage />} />
          <Route 
            path="/payment-manager" 
            element={
              <ProtectedRoute>
                <TransactionManagerPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
