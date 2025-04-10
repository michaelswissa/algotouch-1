
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your pages
import Index from './pages/Index'; // Changed from Home to Index
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Subscription from './pages/Subscription';
import MySubscriptionPage from './pages/MySubscriptionPage'; // Changed from MySubscription to MySubscriptionPage
import ContractDetails from './pages/ContractDetails';
import TokenReceived from './pages/payment/token-received';

import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth/AuthProvider';

// הוסף את ה-class dark ל-html כברירת מחדל בעת הטעינה הראשונית
document.documentElement.classList.add('dark');

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/my-subscription" element={<MySubscriptionPage />} />
          <Route path="/contract/:contractId" element={<ContractDetails />} />
          
          {/* Payment routes */}
          <Route path="/payment/token-received" element={<TokenReceived />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<h1>Page not found</h1>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
