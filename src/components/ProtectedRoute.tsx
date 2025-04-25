
import React, { useEffect } from 'react';
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
  const { registrationData, isInitializing } = useRegistration();
  const location = useLocation();
  
  // Show loading state while checking auth and registration data
  if (!initialized || loading || isInitializing) {
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
    const hasValidRegistrationFlow = registrationData.isValid;
    
    if (isAuthenticated || hasValidRegistrationFlow) {
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
