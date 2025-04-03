
import React from 'react';
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { AdminProvider } from '@/contexts/admin';
import { SidebarProvider } from '@/contexts/sidebar';
import { AuthProvider } from '@/contexts/auth';

import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import Reports from '@/pages/Reports';
import Trades from '@/pages/Trades';
import NewTrade from '@/pages/NewTrade';
import TradeJournal from '@/pages/TradeJournal';
import MonthlyReport from '@/pages/MonthlyReport';
import Calendar from '@/pages/Calendar';
import AIAssistant from '@/pages/AIAssistant';
import Community from '@/pages/Community';
import Courses from '@/pages/Courses';
import CourseDetail from '@/pages/CourseDetail';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import Subscription from '@/pages/Subscription';
import RootLayout from '@/components/RootLayout';

const queryClient = new QueryClient();

// Define routes using JSX elements syntax
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Index />
      },
      {
        path: "/auth",
        element: <Auth />
      },
      {
        path: "/dashboard",
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>
      },
      {
        path: "/profile",
        element: <ProtectedRoute><Profile /></ProtectedRoute>
      },
      {
        path: "/reports",
        element: <ProtectedRoute><Reports /></ProtectedRoute>
      },
      {
        path: "/trades",
        element: <ProtectedRoute><Trades /></ProtectedRoute>
      },
      {
        path: "/trades/new",
        element: <ProtectedRoute><NewTrade /></ProtectedRoute>
      },
      {
        path: "/journal",
        element: <ProtectedRoute><TradeJournal /></ProtectedRoute>
      },
      {
        path: "/reports/monthly",
        element: <ProtectedRoute><MonthlyReport /></ProtectedRoute>
      },
      {
        path: "/calendar",
        element: <ProtectedRoute><Calendar /></ProtectedRoute>
      },
      {
        path: "/assistant",
        element: <ProtectedRoute><AIAssistant /></ProtectedRoute>
      },
      {
        path: "/community",
        element: <ProtectedRoute><Community /></ProtectedRoute>
      },
      {
        path: "/courses",
        element: <ProtectedRoute><Courses /></ProtectedRoute>
      },
      {
        path: "/courses/:id",
        element: <ProtectedRoute><CourseDetail /></ProtectedRoute>
      },
      {
        path: "/blog",
        element: <Blog />
      },
      {
        path: "/blog/:id",
        element: <BlogPost />
      },
      {
        path: "/subscription/:planId?",
        element: <Subscription />
      },
      {
        path: "*",
        element: <NotFound />
      }
    ]
  }
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
