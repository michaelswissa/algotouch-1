
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import useSubscriptionStatus from '@/hooks/useSubscriptionStatus';
import { Spinner } from '@/components/ui/spinner';

interface SubscribedRouteProps {
  children: React.ReactNode;
}

/**
 * A route wrapper that ensures the user has an active subscription
 * Redirects to the subscription page if not
 */
const SubscribedRoute: React.FC<SubscribedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const { isActive, isLoading, isPending } = useSubscriptionStatus();
  const [showLoading, setShowLoading] = useState(true);

  // Only show loading spinner for a short period to avoid flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Show loading spinner while checking auth and subscription status
  if ((loading || isLoading) && showLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location, redirectToSubscription: true }} replace />;
  }

  // If authenticated but no active subscription, redirect to subscription page
  if (!isActive && !isPending) {
    return <Navigate to="/subscription" state={{ from: location }} replace />;
  }

  // If subscription is active or pending, render the children
  return <>{children}</>;
};

export default SubscribedRoute;
