
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LoadingPage } from '@/components/ui/spinner';
import PageTransition from '@/components/PageTransition';

// Import pages directly instead of using lazy imports
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Subscription from './pages/Subscription';
import MySubscriptionPage from './pages/MySubscriptionPage';
import ContractDetails from './pages/ContractDetails';
import Calendar from './pages/Calendar';
import TradeJournal from './pages/TradeJournal';
import MonthlyReport from './pages/MonthlyReport';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Community from './pages/Community';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import AIAssistant from './pages/AIAssistant';
import NewTrade from './pages/NewTrade';
import Journal from './pages/Journal';
import Profile from './pages/Profile';
import PaymentHandling from './pages/PaymentHandling';
import NotFound from './pages/NotFound';
import IframeRedirect from './pages/IframeRedirect';

// Add dark mode by default
document.documentElement.classList.add('dark');

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster position="top-center" richColors />
        <Router>
          <Suspense fallback={<LoadingPage message="טוען..." />}>
            <PageTransition>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={
                  <ProtectedRoute requireAuth={false}>
                    <Auth />
                  </ProtectedRoute>
                } />
                
                {/* Iframe redirection page - public */}
                <Route path="/iframe-redirect" element={<IframeRedirect />} />
                
                {/* Subscription routes */}
                <Route path="/subscription/:planId" element={
                  <ProtectedRoute>
                    <Subscription />
                  </ProtectedRoute>
                } />
                <Route path="/subscription" element={
                  <ProtectedRoute>
                    <Subscription />
                  </ProtectedRoute>
                } />
                <Route path="/my-subscription" element={
                  <ProtectedRoute>
                    <MySubscriptionPage />
                  </ProtectedRoute>
                } />
                
                {/* Payment handling routes */}
                <Route path="/payment/success" element={
                  <ProtectedRoute publicPaths={['/payment/success']}>
                    <PaymentHandling />
                  </ProtectedRoute>
                } />
                <Route path="/payment/error" element={
                  <ProtectedRoute publicPaths={['/payment/error']}>
                    <PaymentHandling />
                  </ProtectedRoute>
                } />
                
                {/* Protected routes - require authentication */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/calendar" element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                } />
                <Route path="/trade-journal" element={
                  <ProtectedRoute>
                    <TradeJournal />
                  </ProtectedRoute>
                } />
                <Route path="/monthly-report" element={
                  <ProtectedRoute>
                    <MonthlyReport />
                  </ProtectedRoute>
                } />
                <Route path="/journal" element={
                  <ProtectedRoute>
                    <Journal />
                  </ProtectedRoute>
                } />
                <Route path="/blog" element={
                  <ProtectedRoute>
                    <Blog />
                  </ProtectedRoute>
                } />
                <Route path="/blog/:id" element={
                  <ProtectedRoute>
                    <BlogPost />
                  </ProtectedRoute>
                } />
                <Route path="/community" element={
                  <ProtectedRoute>
                    <Community />
                  </ProtectedRoute>
                } />
                <Route path="/courses" element={
                  <ProtectedRoute>
                    <Courses />
                  </ProtectedRoute>
                } />
                <Route path="/courses/:courseId" element={
                  <ProtectedRoute>
                    <CourseDetail />
                  </ProtectedRoute>
                } />
                <Route path="/ai-assistant" element={
                  <ProtectedRoute>
                    <AIAssistant />
                  </ProtectedRoute>
                } />
                <Route path="/new-trade" element={
                  <ProtectedRoute>
                    <NewTrade />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/contract/:contractId" element={
                  <ProtectedRoute>
                    <ContractDetails />
                  </ProtectedRoute>
                } />
                
                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </Suspense>
        </Router>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
