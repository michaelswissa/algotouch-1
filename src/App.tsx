
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
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/subscription" element={
            <ProtectedRoute publicPaths={['/subscription']}>
              <Layout>
                <Subscription />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/my-subscription" element={
            <ProtectedRoute>
              <Layout>
                <MySubscriptionPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/monthly-report" element={
            <ProtectedRoute>
              <Layout>
                <MonthlyReport />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <Layout>
                <Calendar />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/trade-journal" element={
            <ProtectedRoute>
              <Layout>
                <TradeJournal />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/trades" element={
            <ProtectedRoute>
              <Layout>
                <Trades />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/blog" element={
            <ProtectedRoute>
              <Layout>
                <Blog />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/community" element={
            <ProtectedRoute>
              <Layout>
                <Community />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/courses" element={
            <ProtectedRoute>
              <Layout>
                <Courses />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/courses/:courseId" element={
            <ProtectedRoute>
              <CourseDetail />
            </ProtectedRoute>
          } />
          <Route path="/ai-assistant" element={
            <ProtectedRoute>
              <Layout>
                <AIAssistant />
              </Layout>
            </ProtectedRoute>
          } />

          {/* 404 route */}
          <Route path="*" element={
            <ProtectedRoute>
              <Layout>
                <NotFound />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
