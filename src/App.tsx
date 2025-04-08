import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/auth';
import { ToastContainer } from 'sonner';

// Import page components
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Subscription from './pages/Subscription';
import UserSubscription from './components/UserSubscription';
import Contract from './pages/Contract';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/user-subscription" element={<UserSubscription />} />
          <Route path="/contract/:contractId" element={<Contract />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
