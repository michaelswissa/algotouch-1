
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
  const [isValidRegistration, setIsValidRegistration] = useState(false);
  
  useEffect(() => {
    // Check for registration data in session storage and validate it
    const registrationData = sessionStorage.getItem('registration_data');
    if (registrationData) {
      try {
        const data = JSON.parse(registrationData);
        const registrationTime = new Date(data.registrationTime);
        const now = new Date();
        const timeDiffInMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
        
        // Registration data is valid if less than 30 minutes old
        const isValid = timeDiffInMinutes < 30;
        setHasRegistrationData(true);
        setIsValidRegistration(isValid);
        
        if (!isValid) {
          console.log("ProtectedRoute: Registration data is stale");
        }
      } catch (error) {
        console.error("Error parsing registration data:", error);
        setHasRegistrationData(false);
        setIsValidRegistration(false);
      }
    } else {
      setHasRegistrationData(false);
      setIsValidRegistration(false);
    }
  }, [location.pathname]);

  // Show consistent loader while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
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
  // 2. User is in registration process (has valid data in sessionStorage) OR
  // 3. User is redirected directly from signup (isRegistering state)
  if (isSubscriptionPath(location.pathname)) {
    if (isAuthenticated || (hasRegistrationData && isValidRegistration) || isRegistering) {
      console.log("ProtectedRoute: Allowing access to subscription path", {
        isAuthenticated,
        hasRegistrationData,
        isValidRegistration,
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
