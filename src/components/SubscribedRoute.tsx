
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useSubscription } from '@/hooks/useSubscription';
import { Spinner } from '@/components/ui/spinner';

interface SubscribedRouteProps {
  children: React.ReactNode;
}

/**
 * SubscribedRoute - A route wrapper that ensures users have an active subscription
 * Redirects unauthenticated users to login and non-subscribers to subscription page
 */
const SubscribedRoute: React.FC<SubscribedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, initialized, loading } = useAuth();
  const location = useLocation();
  const { subscription, loading: subscriptionLoading, details } = useSubscription();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only mark as not checking once both auth and subscription are initialized
    if (initialized && !loading && !subscriptionLoading) {
      setIsChecking(false);
    }
  }, [initialized, loading, subscriptionLoading]);

  // Show loading spinner while checking auth and subscription status
  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
        <span className="ml-2 text-muted-foreground">בודק הרשאות...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location, redirectAfterAuth: true }} replace />;
  }

  // Check if user has an active subscription
  const hasActiveSubscription = subscription && 
    (subscription.status === 'active' || subscription.status === 'trial' || subscription.plan_type === 'vip');

  // If authenticated but no subscription, redirect to subscription page
  if (!hasActiveSubscription) {
    return <Navigate to="/subscription" state={{ from: location }} replace />;
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default SubscribedRoute;
