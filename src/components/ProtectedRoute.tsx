
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  publicPaths?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true,
  publicPaths = ['/auth']
}) => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const location = useLocation();
  const [hasRegistrationData, setHasRegistrationData] = useState(false);
  
  useEffect(() => {
    // Check for registration data in session storage
    const registrationData = sessionStorage.getItem('registration_data');
    setHasRegistrationData(!!registrationData);
  }, [location.pathname]);

  // Show consistent loader while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Check for registration in progress from location state
  const isRegistering = location.state?.isRegistering === true;

  // Allow access to public paths regardless of auth status
  if (isPublicPath(location.pathname, publicPaths)) {
    return <>{children}</>;
  }

  // Special case for subscription page - allow access if:
  // 1. User is authenticated OR
  // 2. User is in registration process (has data in sessionStorage) OR
  // 3. User is redirected directly from signup (isRegistering state)
  if (isSubscriptionPath(location.pathname)) {
    if (isAuthenticated || hasRegistrationData || isRegistering) {
      console.log("ProtectedRoute: Allowing access to subscription path", {
        isAuthenticated,
        hasRegistrationData,
        isRegistering
      });
      return <>{children}</>;
    }
    console.log("ProtectedRoute: User is not authenticated for subscription, redirecting to auth");
    return <Navigate to="/auth" state={{ from: location, redirectToSubscription: true }} replace />;
  }

  if (requireAuth && !isAuthenticated) {
    console.log("ProtectedRoute: User is not authenticated, redirecting to auth");
    // Redirect to login page if not authenticated
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    console.log("ProtectedRoute: User is already authenticated, redirecting to dashboard");
    // Redirect to dashboard if already authenticated (for login/register pages)
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Helper functions to improve readability
function isPublicPath(path: string, publicPaths: string[]): boolean {
  return publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );
}

function isSubscriptionPath(path: string): boolean {
  return path === '/subscription' || path.startsWith('/subscription/');
}

export default ProtectedRoute;
