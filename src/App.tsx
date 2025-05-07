
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LoadingPage } from '@/components/ui/spinner';

// Import your pages lazily to avoid circular dependencies
const Index = React.lazy(() => import('./pages/Index'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const MySubscriptionPage = React.lazy(() => import('./pages/MySubscriptionPage'));
const ContractDetails = React.lazy(() => import('./pages/ContractDetails'));
const Calendar = React.lazy(() => import('./pages/Calendar'));
const TradeJournal = React.lazy(() => import('./pages/TradeJournal'));
const MonthlyReport = React.lazy(() => import('./pages/MonthlyReport'));
const Blog = React.lazy(() => import('./pages/Blog'));
const BlogPost = React.lazy(() => import('./pages/BlogPost'));
const Community = React.lazy(() => import('./pages/Community'));
const Courses = React.lazy(() => import('./pages/Courses'));
const CourseDetail = React.lazy(() => import('./pages/CourseDetail'));
const AIAssistant = React.lazy(() => import('./pages/AIAssistant'));
const NewTrade = React.lazy(() => import('./pages/NewTrade'));
const Journal = React.lazy(() => import('./pages/Journal'));
const Profile = React.lazy(() => import('./pages/Profile'));
const PaymentHandling = React.lazy(() => import('./pages/PaymentHandling'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// הוסף את ה-class dark ל-html כברירת מחדל בעת הטעינה הראשונית
document.documentElement.classList.add('dark');

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster position="top-center" richColors />
        <Router>
          <React.Suspense fallback={<LoadingPage />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={
                <ProtectedRoute requireAuth={false}>
                  <Auth />
                </ProtectedRoute>
              } />
              
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
          </React.Suspense>
        </Router>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
