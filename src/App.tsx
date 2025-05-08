
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import MySubscriptionPage from './pages/MySubscriptionPage';
import { AuthProvider } from './contexts/auth';
import { SubscriptionProvider } from './contexts/subscription/SubscriptionContext';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/my-subscription" element={<MySubscriptionPage />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
