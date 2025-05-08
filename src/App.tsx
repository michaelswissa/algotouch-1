
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import MySubscriptionPage from './pages/MySubscriptionPage';
import MonthlyReport from './pages/MonthlyReport';
import Calendar from './pages/Calendar';
import TradeJournal from './pages/TradeJournal';
import Blog from './pages/Blog';
import Community from './pages/Community';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import AIAssistant from './pages/AIAssistant';
import Auth from './pages/Auth';
import Trades from './pages/Trades';
import NotFound from './pages/NotFound';
import { AuthProvider } from './contexts/auth';
import { SubscriptionProvider } from './contexts/subscription/SubscriptionContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <Routes>
          {/* Public route */}
          <Route path="/auth" element={
            <ProtectedRoute requireAuth={false} publicPaths={['/auth']}>
              <Auth />
            </ProtectedRoute>
          } />

          {/* Protected routes with Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/subscription" element={
              <ProtectedRoute publicPaths={['/subscription']}>
                <Subscription />
              </ProtectedRoute>
            } />
            <Route path="/my-subscription" element={
              <ProtectedRoute>
                <MySubscriptionPage />
              </ProtectedRoute>
            } />
            <Route path="/monthly-report" element={
              <ProtectedRoute>
                <MonthlyReport />
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
            <Route path="/trades" element={
              <ProtectedRoute>
                <Trades />
              </ProtectedRoute>
            } />
            <Route path="/blog" element={
              <ProtectedRoute>
                <Blog />
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
            {/* 404 route */}
            <Route path="*" element={
              <ProtectedRoute>
                <NotFound />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
