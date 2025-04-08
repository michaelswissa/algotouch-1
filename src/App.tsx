
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EnhancedProtectedRoute from './components/EnhancedProtectedRoute';
import { AuthProvider } from './contexts/auth';
import { EnhancedSubscriptionProvider } from './contexts/subscription/EnhancedSubscriptionContext';
import './App.css';

// Pages
import Auth from './pages/Auth';
import Subscription from './pages/Subscription';
import MySubscriptionPage from './pages/MySubscriptionPage';
import UpdatePayment from './pages/UpdatePayment';
import Dashboard from './pages/Dashboard';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <EnhancedSubscriptionProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={
              <EnhancedProtectedRoute requireAuth={false}>
                <Auth />
              </EnhancedProtectedRoute>
            } />
            
            {/* Subscription process routes */}
            <Route path="/subscription" element={
              <EnhancedProtectedRoute>
                <Subscription />
              </EnhancedProtectedRoute>
            } />
            
            {/* Authenticated routes */}
            <Route path="/my-subscription" element={
              <EnhancedProtectedRoute requireAuth={true}>
                <MySubscriptionPage />
              </EnhancedProtectedRoute>
            } />
            
            <Route path="/update-payment" element={
              <EnhancedProtectedRoute requireAuth={true}>
                <UpdatePayment />
              </EnhancedProtectedRoute>
            } />
            
            {/* Protected content routes */}
            <Route path="/dashboard" element={
              <EnhancedProtectedRoute 
                requireAuth={true} 
                requireCompletedRegistration={true}
                requireActiveSubscription={true}
              >
                <Dashboard />
              </EnhancedProtectedRoute>
            } />
            
            {/* Default route redirects to auth */}
            <Route path="*" element={
              <EnhancedProtectedRoute requireAuth={false}>
                <Auth />
              </EnhancedProtectedRoute>
            } />
          </Routes>
        </EnhancedSubscriptionProvider>
      </Router>
    </AuthProvider>
  );
};

export default App;
