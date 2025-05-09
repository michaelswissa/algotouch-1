
import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';

// Import all pages statically
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Calendar from '@/pages/Calendar';
import TradeJournal from '@/pages/TradeJournal';
import MonthlyReport from '@/pages/MonthlyReport';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';
import Community from '@/pages/Community';
import Courses from '@/pages/Courses';
import CourseDetail from '@/pages/CourseDetail';
import AIAssistant from '@/pages/AIAssistant';
import NewTrade from '@/pages/NewTrade';
import Journal from '@/pages/Journal';
import Profile from '@/pages/Profile';
import Subscription from '@/pages/Subscription';
import MySubscriptionPage from '@/pages/MySubscriptionPage';
import PaymentHandling from '@/pages/PaymentHandling';
import IframeRedirect from '@/pages/IframeRedirect';
import NotFound from '@/pages/NotFound';
import ContractDetails from '@/pages/ContractDetails';

// Define route configurations all in one place
export const routes = [
  // Public routes
  {
    path: '/',
    element: <Index />,
    isPublic: true
  },
  {
    path: '/auth',
    element: <ProtectedRoute requireAuth={false}><Auth /></ProtectedRoute>,
    isPublic: true
  },
  {
    path: '/iframe-redirect',
    element: <IframeRedirect />,
    isPublic: true
  },
  
  // Payment handling routes
  {
    path: '/payment/success',
    element: <ProtectedRoute publicPaths={['/payment/success']}><PaymentHandling /></ProtectedRoute>,
    isPublic: true
  },
  {
    path: '/payment/error',
    element: <ProtectedRoute publicPaths={['/payment/error']}><PaymentHandling /></ProtectedRoute>,
    isPublic: true
  },
  
  // Subscription routes
  {
    path: '/subscription/:planId',
    element: <ProtectedRoute><Subscription /></ProtectedRoute>
  },
  {
    path: '/subscription',
    element: <ProtectedRoute><Subscription /></ProtectedRoute>
  },
  {
    path: '/my-subscription',
    element: <ProtectedRoute><MySubscriptionPage /></ProtectedRoute>
  },
  
  // Protected routes
  {
    path: '/dashboard',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>
  },
  {
    path: '/calendar',
    element: <ProtectedRoute><Calendar /></ProtectedRoute>
  },
  {
    path: '/trade-journal',
    element: <ProtectedRoute><TradeJournal /></ProtectedRoute>
  },
  {
    path: '/monthly-report',
    element: <ProtectedRoute><MonthlyReport /></ProtectedRoute>
  },
  {
    path: '/journal',
    element: <ProtectedRoute><Journal /></ProtectedRoute>
  },
  {
    path: '/blog',
    element: <ProtectedRoute><Blog /></ProtectedRoute>
  },
  {
    path: '/blog/:id',
    element: <ProtectedRoute><BlogPost /></ProtectedRoute>
  },
  {
    path: '/community',
    element: <ProtectedRoute><Community /></ProtectedRoute>
  },
  {
    path: '/courses',
    element: <ProtectedRoute><Courses /></ProtectedRoute>
  },
  {
    path: '/courses/:courseId',
    element: <ProtectedRoute><CourseDetail /></ProtectedRoute>
  },
  {
    path: '/ai-assistant',
    element: <ProtectedRoute><AIAssistant /></ProtectedRoute>
  },
  {
    path: '/new-trade',
    element: <ProtectedRoute><NewTrade /></ProtectedRoute>
  },
  {
    path: '/profile',
    element: <ProtectedRoute><Profile /></ProtectedRoute>
  },
  {
    path: '/contract/:contractId',
    element: <ProtectedRoute><ContractDetails /></ProtectedRoute>
  },
  
  // Catch-all route
  {
    path: '*',
    element: <NotFound />
  }
];

// Helper function to generate Route components from route config
export const generateRouteComponents = () => {
  return routes.map((route, index) => (
    <Route
      key={`route-${index}-${route.path}`}
      path={route.path}
      element={route.element}
    />
  ));
};
