
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { AppRole } from '@/contexts/auth/role-types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: AppRole;
  publicPaths?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true,
  requiredRole,
  publicPaths = ['/auth']
}) => {
  const { isAuthenticated, loading, initialized, checkUserRole } = useAuth();
  const location = useLocation();
  const [hasRegistrationData, setHasRegistrationData] = useState(false);
  const [hasValidFlow, setHasValidFlow] = useState(false);
  
  useEffect(() => {
    try {
      // Validate registration data
      const registrationData = sessionStorage.getItem('registration_data');
      const contractData = sessionStorage.getItem('contract_data');
      
      if (registrationData) {
        const data = JSON.parse(registrationData);
        const registrationTime = new Date(data.registrationTime);
        const now = new Date();
        const timeDiffInMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
        
        const isRegistrationValid = timeDiffInMinutes < 30;
        setHasRegistrationData(isRegistrationValid);
        
        if (!isRegistrationValid) {
          console.log('Registration data expired');
          sessionStorage.removeItem('registration_data');
          sessionStorage.removeItem('contract_data');
          toast.error('מידע ההרשמה פג תוקף, אנא הירשם שנית');
        }
      }
      
      // Consider the flow valid if:
      // 1. User is authenticated OR
      // 2. Has valid contract data OR
      // 3. Has valid registration data and is in the signup process
      const isValidFlow = isAuthenticated || 
                         Boolean(contractData) || 
                         (registrationData && hasRegistrationData);
                         
      setHasValidFlow(isValidFlow);
      
    } catch (error) {
      console.error("Error checking registration/contract data:", error);
      setHasRegistrationData(false);
      setHasValidFlow(false);
      sessionStorage.removeItem('registration_data');
      sessionStorage.removeItem('contract_data');
    }
  }, [location.pathname, isAuthenticated]);

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
    if (isAuthenticated || hasValidFlow) {
      console.log("ProtectedRoute: Allowing access to subscription path", {
        isAuthenticated,
        hasRegistrationData,
        hasValidFlow
      });
      return <>{children}</>;
    }
    
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Allow access to public paths regardless of auth status
  if (publicPaths.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`))) {
    return <>{children}</>;
  }

  // Check authentication requirements
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Role-based access control
  if (requiredRole && isAuthenticated) {
    if (!checkUserRole(requiredRole)) {
      toast.error(`You need ${requiredRole} permissions to access this page`);
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
