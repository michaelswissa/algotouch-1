
import React from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';

// Import Auth and Dashboard pages directly to prevent dynamic imports
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';
import CourseDetail from '@/pages/CourseDetail';

// Define route configurations
export const routes = [
  // Public routes
  {
    path: '/auth',
    element: <ProtectedRoute requireAuth={false}><Auth /></ProtectedRoute>,
    isPublic: true
  },
  
  // Protected routes
  {
    path: '/dashboard',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>
  },
  {
    path: '/courses/:courseId',
    element: <ProtectedRoute><CourseDetail /></ProtectedRoute>
  },
  
  // Catch-all route
  {
    path: '*',
    element: <NotFound />
  }
];

// Helper function to generate Route components from route config
export const generateRouteComponents = () => {
  try {
    return routes.map((route, index) => (
      <Route
        key={`route-${index}-${route.path}`}
        path={route.path}
        element={route.element}
      />
    ));
  } catch (error) {
    console.error("Failed to generate route components:", error);
    // Fallback to basic routes if there's an error
    return [
      <Route key="dashboard" path="/dashboard" element={<Dashboard />} />,
      <Route key="auth" path="/auth" element={<Auth />} />,
      <Route key="not-found" path="*" element={<NotFound />} />
    ];
  }
};
