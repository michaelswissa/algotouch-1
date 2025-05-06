
import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SubscriptionPage from "./pages/Subscription";
import SubscriptionSuccess from "./components/subscription/SubscriptionSuccess";
import SubscriptionFailed from "./components/subscription/SubscriptionFailed";
import Profile from "./pages/Profile";
import Calendar from "./pages/Calendar";
import Blog from "./pages/Blog";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import SubscribedRoute from "./components/SubscribedRoute";
import AdminRoute from "./components/AdminRoute";
import PaymentRedirectPage from "./pages/PaymentRedirectPage";
import CardComRedirectPage from "./pages/CardComRedirectPage";
import IframePaymentPage from "./pages/IframePaymentPage";

// Create the router without using React.lazy() for any components
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
  {
    path: "/cardcom-redirect",
    element: <CardComRedirectPage />,
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
  {
    path: "/subscription/failed", 
    element: <SubscriptionFailed />,
  },
  
  // Protected routes that require authentication
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  
  // Protected routes that also require subscription
  {
    path: "/calendar",
    element: (
      <SubscribedRoute>
        <Calendar />
      </SubscribedRoute>
    ),
  },
  {
    path: "/blog",
    element: (
      <SubscribedRoute>
        <Blog />
      </SubscribedRoute>
    ),
  },
  {
    path: "/courses",
    element: (
      <SubscribedRoute>
        <Courses />
      </SubscribedRoute>
    ),
  },
  {
    path: "/courses/:courseId",
    element: (
      <SubscribedRoute>
        <CourseDetail />
      </SubscribedRoute>
    ),
  },
  
  // Admin routes
  {
    path: "/admin",
    element: (
      <AdminRoute>
        <Admin />
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
