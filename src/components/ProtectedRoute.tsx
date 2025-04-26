
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useRegistration } from '@/contexts/registration/RegistrationContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowRegistrationFlow?: boolean;
  publicPaths?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true,
  allowRegistrationFlow = false,
  publicPaths = ['/auth']
}) => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const { registrationData, isInitializing, clearRegistrationData } = useRegistration();
  const [isCheckingRoute, setIsCheckingRoute] = useState(true);
  const location = useLocation();
  
  // Perform route check after auth and registration are initialized
  useEffect(() => {
    if (initialized && !loading && !isInitializing) {
      setIsCheckingRoute(false);
    }
  }, [initialized, loading, isInitializing]);

  // Prevent automatic redirection to subscription for new visitors
  useEffect(() => {
    // Check if we're on the root or index page
    if (location.pathname === '/' || location.pathname === '/index.html') {
      // If there's registration data without auth, clear it to prevent automatic redirects
      if (!isAuthenticated && registrationData) {
        clearRegistrationData();
      }
    }
  }, [location.pathname, isAuthenticated, registrationData, clearRegistrationData]);
  
  // Show loading state while checking auth and registration data
  if (isCheckingRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Allow access to public paths regardless of auth status
  if (publicPaths.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`))) {
    return <>{children}</>;
  }

  // Special handling for subscription flow
  if (location.pathname.startsWith('/subscription') && allowRegistrationFlow) {
    // FIXED: Only allow registration flow if user is authenticated
    // Previously allowed non-authenticated users with registrationData to access subscription
    if (isAuthenticated) {
      return <>{children}</>;
    }
    
    return <Navigate to="/auth" state={{ redirectToSubscription: true }} replace />;
  }

  // Standard auth checks
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
