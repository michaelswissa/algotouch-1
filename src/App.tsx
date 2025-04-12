
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';
import Subscription from '@/pages/Subscription';
import MySubscriptionPage from '@/pages/MySubscriptionPage';
import PaymentStatusPage from '@/pages/PaymentStatusPage';
import PaymentSuccessPage from '@/pages/PaymentSuccessPage';
import HomePage from '@/pages/HomePage';
import AuthPage from '@/pages/AuthPage';
import ProfilePage from '@/pages/ProfilePage';
import DashboardPage from '@/pages/DashboardPage';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/payment-status" element={<PaymentStatusPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/my-subscription" element={<ProtectedRoute><MySubscriptionPage /></ProtectedRoute>} />
      </Routes>

      <Toaster />
    </>
  );
}

export default App;
