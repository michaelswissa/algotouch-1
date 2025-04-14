
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

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
          toast.error('מידע ההרשמה פג תוקף, אנא הירשם שנית');
          sessionStorage.removeItem('registration_data');
        }
      } catch (error) {
        console.error("Error parsing registration data:", error);
        setHasRegistrationData(false);
        setIsValidRegistration(false);
        sessionStorage.removeItem('registration_data');
      }
    } else {
      setHasRegistrationData(false);
      setIsValidRegistration(false);
    }
  }, [location.pathname]);

  // Show loading state while checking auth
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Special case for contract signing and subscription flow
  if (location.pathname.startsWith('/subscription')) {
    // Allow access if:
    // 1. User is authenticated OR
    // 2. Has valid registration data OR
    // 3. Coming from contract signing (stored in session)
    const hasContractData = sessionStorage.getItem('contract_data');
    
    if (isAuthenticated || (hasRegistrationData && isValidRegistration) || hasContractData) {
      console.log("ProtectedRoute: Allowing access to subscription path", {
        isAuthenticated,
        hasRegistrationData,
        isValidRegistration,
        hasContractData
      });
      return <>{children}</>;
    }
    return <Navigate to="/auth" state={{ from: location, redirectToSubscription: true }} replace />;
  }

  // Allow access to public paths regardless of auth status
  if (isPublicPath(location.pathname, publicPaths)) {
    return <>{children}</>;
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

// Helper functions to improve readability
function isPublicPath(path: string, publicPaths: string[]): boolean {
  return publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );
}

export default ProtectedRoute;
