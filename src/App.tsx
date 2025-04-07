
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/auth';
import { EnhancedSubscriptionProvider } from '@/contexts/subscription/EnhancedSubscriptionContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import Auth from '@/pages/Auth';
import Subscription from '@/pages/Subscription';
import UpdatePayment from '@/pages/UpdatePayment';
import Layout from '@/components/Layout';
import PaymentUpdateBanner from '@/components/subscription/PaymentUpdateBanner';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EnhancedSubscriptionProvider>
          <PaymentUpdateBanner />
          <Routes>
            <Route path="/auth" element={
              <ProtectedRoute requireAuth={false}>
                <Auth />
              </ProtectedRoute>
            } />
            
            <Route path="/subscription/*" element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            } />
            
            <Route path="/update-payment" element={
              <ProtectedRoute>
                <UpdatePayment />
              </ProtectedRoute>
            } />
            
            <Route path="/my-subscription" element={
              <ProtectedRoute requireCompleteRegistration={true}>
                <Layout>
                  <div className="container py-6">
                    <h1>My Subscription Page</h1>
                  </div>
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute requireAuth={true} requireCompleteRegistration={true}>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<ProtectedRoute requireAuth={true}><Dashboard /></ProtectedRoute>} />
          </Routes>
          <Toaster position="top-center" richColors />
        </EnhancedSubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
