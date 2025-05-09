
import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import ProtectedRoute from "@/components/ProtectedRoute";

// Direct imports without lazy loading
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/Calendar";
import TradeJournal from "./pages/TradeJournal";
import MonthlyReport from "./pages/MonthlyReport";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Community from "./pages/Community";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import AIAssistant from "./pages/AIAssistant";
import NotFound from "./pages/NotFound";
import NewTrade from "./pages/NewTrade";
import Journal from "./pages/Journal";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import MySubscriptionPage from "./pages/MySubscriptionPage";
import Index from "./pages/Index";
import PaymentHandling from "./pages/PaymentHandling";
import IframeRedirect from "./pages/IframeRedirect";

const AppRoutes: React.FC = () => {
  const { signIn, signOut } = useAuth();
  
  // Create enhanced versions of auth methods with navigation
  const enhancedAuthMethods = {
    signIn: async (email: string, password: string) => {
      try {
        await signIn(email, password);
        return { success: true };
      } catch (error) {
        throw error;
      }
    },
    signOut: async () => {
      try {
        await signOut();
        return { success: true };
      } catch (error) {
        throw error;
      }
    }
  };

  return (
    <Routes>
      {/* Root route - redirects to auth page */}
      <Route path="/" element={<Index />} />
      
      {/* Public routes */}
      <Route path="/auth" element={
        <ProtectedRoute requireAuth={false}>
          <Auth />
        </ProtectedRoute>
      } />
      
      {/* Subscription routes - protected to ensure auth first */}
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
      
      {/* Iframe redirection page - public */}
      <Route path="/iframe-redirect" element={<IframeRedirect />} />
      
      {/* Protected routes - require authentication */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute>
          <CalendarPage />
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
      
      {/* Catch all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
