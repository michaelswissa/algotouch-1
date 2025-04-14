
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubscribedRoute from '@/components/SubscribedRoute';
import Home from '@/pages/Home';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Subscription from '@/pages/Subscription';
import MySubscription from '@/pages/MySubscription';
import "./App.css";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={
          <ProtectedRoute requireAuth={false}>
            <Auth />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <SubscribedRoute>
            <Dashboard />
          </SubscribedRoute>
        } />
        <Route path="/subscription" element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        } />
        <Route path="/subscription/:planId" element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        } />
        <Route path="/my-subscription" element={
          <ProtectedRoute>
            <MySubscription />
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster richColors position="top-center" expand={true} />
    </>
  );
}

export default App;
