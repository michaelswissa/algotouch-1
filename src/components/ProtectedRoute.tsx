
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
  const [hasValidFlow, setHasValidFlow] = useState(false);
  
  useEffect(() => {
    try {
      // Get both registration and contract data
      const registrationData = sessionStorage.getItem('registration_data');
      const contractData = sessionStorage.getItem('contract_data');
      
      if (registrationData) {
        const data = JSON.parse(registrationData);
        const registrationTime = new Date(data.registrationTime);
        const now = new Date();
        const timeDiffInMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
        
        // Registration data is valid if less than 30 minutes old
        const isRegistrationValid = timeDiffInMinutes < 30;
        setHasRegistrationData(isRegistrationValid);
        
        if (!isRegistrationValid) {
          toast.error('מידע ההרשמה פג תוקף, אנא הירשם שנית');
          sessionStorage.removeItem('registration_data');
          sessionStorage.removeItem('contract_data');
        }
      }
      
      // Consider the flow valid if we have contract data from a registered user
      // or if we have valid registration data (for new users)
      const isValidFlow = Boolean(contractData) || (registrationData && hasRegistrationData);
      setHasValidFlow(isValidFlow);
      
    } catch (error) {
      console.error("Error checking registration/contract data:", error);
      setHasRegistrationData(false);
      setHasValidFlow(false);
      sessionStorage.removeItem('registration_data');
      sessionStorage.removeItem('contract_data');
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

  // Special handling for subscription flow
  if (location.pathname.startsWith('/subscription')) {
    // Allow access if:
    // 1. User is authenticated OR
    // 2. Has valid registration flow OR
    // 3. Has valid contract data
    if (isAuthenticated || hasValidFlow) {
      console.log("ProtectedRoute: Allowing access to subscription path", {
        isAuthenticated,
        hasRegistrationData,
        hasValidFlow
      });
      return <>{children}</>;
    }
    
    // If no valid state, redirect to auth
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Allow access to public paths regardless of auth status
  if (publicPaths.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`))) {
    return <>{children}</>;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
