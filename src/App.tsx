
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import SubscribedRoute from "@/components/SubscribedRoute";
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

// Configure with refresh on error
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

const App = () => {
  // Set RTL direction and dark mode at the document level
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "he";
    document.documentElement.classList.add('dark');
    
    // Add transition classes to body for smoother theme transitions
    document.body.classList.add('transition-colors', 'duration-300');
    
    // Fade in the whole app
    const timer = setTimeout(() => {
      document.body.style.opacity = "1";
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner position="top-right" expand={true} closeButton toastOptions={{
              classNames: {
                toast: 'group p-4 backdrop-blur-md bg-secondary/90 dark:bg-card/90 shadow-xl',
                title: 'text-base font-semibold text-foreground',
                description: 'text-sm text-muted-foreground',
                actionButton: 'bg-primary text-primary-foreground',
                cancelButton: 'bg-secondary text-secondary-foreground',
                error: '!bg-red-500/20 border-red-500/50',
                success: '!bg-green-500/20 border-green-500/50',
              }
            }} />
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
              
              {/* Premium content routes - require subscription */}
              <Route path="/calendar" element={
                <SubscribedRoute>
                  <CalendarPage />
                </SubscribedRoute>
              } />
              <Route path="/trade-journal" element={
                <SubscribedRoute>
                  <TradeJournal />
                </SubscribedRoute>
              } />
              <Route path="/monthly-report" element={
                <SubscribedRoute>
                  <MonthlyReport />
                </SubscribedRoute>
              } />
              <Route path="/journal" element={
                <SubscribedRoute>
                  <Journal />
                </SubscribedRoute>
              } />
              <Route path="/blog" element={
                <SubscribedRoute>
                  <Blog />
                </SubscribedRoute>
              } />
              <Route path="/blog/:id" element={
                <SubscribedRoute>
                  <BlogPost />
                </SubscribedRoute>
              } />
              <Route path="/ai-assistant" element={
                <SubscribedRoute>
                  <AIAssistant />
                </SubscribedRoute>
              } />
              <Route path="/courses" element={
                <SubscribedRoute>
                  <Courses />
                </SubscribedRoute>
              } />
              <Route path="/courses/:courseId" element={
                <SubscribedRoute>
                  <CourseDetail />
                </SubscribedRoute>
              } />
              <Route path="/new-trade" element={
                <SubscribedRoute>
                  <NewTrade />
                </SubscribedRoute>
              } />
              
              {/* Protected routes that don't require subscription */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/community" element={
                <ProtectedRoute>
                  <Community />
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
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
