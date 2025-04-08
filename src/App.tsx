import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Subscription from './pages/Subscription';
import MySubscription from './pages/MySubscription';
import ContractDetails from './pages/ContractDetails'; // New import

import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/my-subscription" element={<MySubscription />} />
          <Route path="/contract/:contractId" element={<ContractDetails />} /> {/* New route */}
          
          {/* Add any other routes you have */}
          
          {/* Catch-all route */}
          <Route path="*" element={<h1>Page not found</h1>} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
