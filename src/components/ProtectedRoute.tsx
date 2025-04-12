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
    const registrationData = sessionStorage.getItem('registration_data');
    if (registrationData) {
      try {
        const data = JSON.parse(registrationData);
        const registrationTime = new Date(data.registrationTime);
        const now = new Date();
        const timeDiffInMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
        
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

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const isRegistering = location.state?.isRegistering === true;

  if (isPublicPath(location.pathname, publicPaths)) {
    return <>{children}</>;
  }

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
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    console.log("ProtectedRoute: User is already authenticated, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function isPublicPath(path: string, publicPaths: string[]): boolean {
  return publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );
}

function isSubscriptionPath(path: string): boolean {
  return path === '/subscription' || path.startsWith('/subscription/');
}

export default ProtectedRoute;
