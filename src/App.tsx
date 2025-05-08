
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LoadingPage, Spinner } from '@/components/ui/spinner';
import RoutePrefetcher from '@/components/RoutePrefetcher';
import PageTransition from '@/components/PageTransition';
import { SubscriptionProvider } from '@/contexts/subscription/SubscriptionContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Using normal import for critical components to avoid loading failures
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';

// Import other pages lazily with error boundaries
const Index = lazy(() => import('./pages/Index'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Subscription = lazy(() => import('./pages/Subscription'));
const MySubscriptionPage = lazy(() => import('./pages/MySubscriptionPage'));
const ContractDetails = lazy(() => import('./pages/ContractDetails'));
const Calendar = lazy(() => import('./pages/Calendar'));
const TradeJournal = lazy(() => import('./pages/TradeJournal'));
const MonthlyReport = lazy(() => import('./pages/MonthlyReport'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Community = lazy(() => import('./pages/Community'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const NewTrade = lazy(() => import('./pages/NewTrade'));
const Journal = lazy(() => import('./pages/Journal'));
const Profile = lazy(() => import('./pages/Profile'));
const PaymentHandling = lazy(() => import('./pages/PaymentHandling'));

// Add dark mode by default
document.documentElement.classList.add('dark');

// Custom loading component for Suspense
const LazyLoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner size="lg" className="text-primary" />
  </div>
);

function App() {
  return (
    <ErrorBoundary fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">שגיאה בטעינת היישום</h2>
        <p className="mb-4">אירעה שגיאה בטעינת היישום. אנא נסה לרענן את הדף.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          רענן דף
        </button>
      </div>
    }>
      <AuthProvider>
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router>
            <Suspense fallback={<LazyLoadingFallback />}>
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
                    <SubscriptionProvider>
                      <Subscription />
                    </SubscriptionProvider>
                  </ProtectedRoute>
                } />
                <Route path="/subscription" element={
                  <ProtectedRoute>
                    <SubscriptionProvider>
                      <Subscription />
                    </SubscriptionProvider>
                  </ProtectedRoute>
                } />
                <Route path="/my-subscription" element={
                  <ProtectedRoute>
                    <SubscriptionProvider>
                      <MySubscriptionPage />
                    </SubscriptionProvider>
                  </ProtectedRoute>
                } />
                
                {/* Payment handling routes */}
                <Route path="/payment/success" element={
                  <ProtectedRoute publicPaths={['/payment/success']}>
                    <SubscriptionProvider>
                      <PaymentHandling />
                    </SubscriptionProvider>
                  </ProtectedRoute>
                } />
                <Route path="/payment/error" element={
                  <ProtectedRoute publicPaths={['/payment/error']}>
                    <SubscriptionProvider>
                      <PaymentHandling />
                    </SubscriptionProvider>
                  </ProtectedRoute>
                } />
                
                {/* Protected routes - require authentication */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Dashboard />
                    </ErrorBoundary>
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
                    <SubscriptionProvider>
                      <Profile />
                    </SubscriptionProvider>
                  </ProtectedRoute>
                } />
                <Route path="/contract/:contractId" element={
                  <ProtectedRoute>
                    <SubscriptionProvider>
                      <ContractDetails />
                    </SubscriptionProvider>
                  </ProtectedRoute>
                } />
                
                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <RoutePrefetcher />
            </Suspense>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
