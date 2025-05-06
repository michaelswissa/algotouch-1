import { createBrowserRouter } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SubscriptionPage from "./pages/Subscription";
import SubscriptionSuccess from "./components/subscription/SubscriptionSuccess";
import ProfilePage from "./pages/ProfilePage";
import CalendarPage from "./pages/CalendarPage";
import BlogPage from "./pages/BlogPage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import AdminPage from "./pages/AdminPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscribedRoute } from "./components/SubscribedRoute";
import { AdminRoute } from "./components/AdminRoute";
import PaymentRedirectPage from "./pages/PaymentRedirectPage";
import IframePaymentPage from "./pages/IframePaymentPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  
  // Payment redirect pages for handling CardCom redirects
  {
    path: "/payment/redirect", 
    element: <PaymentRedirectPage />,
  },
  {
    path: "/payment-redirect-success.html", 
    element: <PaymentRedirectPage />,
  },
  {
    path: "/payment-redirect-failed.html", 
    element: <PaymentRedirectPage />,
  },
  
  // Direct payment page route (for testing the iframe separately if needed)
  {
    path: "/payment/:planId?", 
    element: <IframePaymentPage />,
  },
  
  // Subscription routes
  {
    path: "/subscription", 
    element: <SubscriptionPage />,
  },
  {
    path: "/subscription/success", 
    element: <SubscriptionSuccess />,
  },
  
  // Protected routes that require authentication
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  
  // Protected routes that also require subscription
  {
    path: "/calendar",
    element: (
      <SubscribedRoute>
        <CalendarPage />
      </SubscribedRoute>
    ),
  },
  {
    path: "/blog",
    element: (
      <SubscribedRoute>
        <BlogPage />
      </SubscribedRoute>
    ),
  },
  {
    path: "/courses",
    element: (
      <SubscribedRoute>
        <CoursesPage />
      </SubscribedRoute>
    ),
  },
  {
    path: "/courses/:courseId",
    element: (
      <SubscribedRoute>
        <CourseDetailPage />
      </SubscribedRoute>
    ),
  },
  
  // Admin routes
  {
    path: "/admin",
    element: (
      <AdminRoute>
        <AdminPage />
      </AdminRoute>
    ),
  },
  
  // Catch-all route for 404s
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
