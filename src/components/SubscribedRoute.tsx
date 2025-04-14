
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useSubscription } from '@/hooks/useSubscription';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

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
  const { subscription, loading: subscriptionLoading, details, error, refetch } = useSubscription();
  const [isChecking, setIsChecking] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  // Check for in-progress registration
  const [hasRegistrationInProgress, setHasRegistrationInProgress] = useState(false);
  
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      setHasRegistrationInProgress(!!storedData);
    } catch (err) {
      console.error('Error checking registration data:', err);
    }
  }, []);

  useEffect(() => {
    if (error && !isRetrying) {
      console.error('Error fetching subscription status:', error);
      setIsRetrying(true);
      
      // Retry fetching subscription after delay
      const retryTimer = setTimeout(() => {
        refetch();
        setIsRetrying(false);
      }, 3000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [error, isRetrying, refetch]);

  useEffect(() => {
    // Only mark as not checking once both auth and subscription are initialized
    if (initialized && !loading && !subscriptionLoading) {
      setIsChecking(false);
    }
  }, [initialized, loading, subscriptionLoading]);

  // If registration is in progress, redirect to subscription page
  if (hasRegistrationInProgress) {
    return <Navigate to="/subscription" state={{ from: location, isRegistering: true }} replace />;
  }

  // Show loading spinner while checking auth and subscription status
  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
        <span className="mr-2 text-muted-foreground">בודק הרשאות...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location, redirectAfterAuth: true }} replace />;
  }

  // Check if user has an active subscription
  const hasActiveSubscription = subscription && 
    (subscription.status === 'active' || 
     subscription.status === 'trial' || 
     subscription.plan_type === 'vip');

  // Check if subscription has expired but status hasn't been updated
  if (subscription && subscription.status !== 'vip' && details) {
    const isExpired = details.daysLeft <= 0 && 
      subscription.status !== 'cancelled' && 
      subscription.status !== 'expired';
    
    if (isExpired) {
      // Don't block the user here, but notify them
      toast.warning('המנוי שלך פג תוקף. אנא חדש את המנוי כדי להמשיך להשתמש בשירות.', {
        duration: 8000,
        action: {
          label: 'חדש מנוי',
          onClick: () => window.location.href = '/subscription'
        }
      });
    }
  }

  // Check for trial status and notify when close to expiration
  if (subscription && subscription.status === 'trial' && details && details.daysLeft <= 3) {
    toast.warning(`תקופת הניסיון שלך תסתיים בקרוב (${details.daysLeft} ימים נותרו)`, {
      id: 'trial-expiring',  // Prevent duplicate toasts
      duration: 6000,
      action: {
        label: 'שדרג עכשיו',
        onClick: () => window.location.href = '/subscription'
      }
    });
  }

  // If authenticated but no subscription, redirect to subscription page
  if (!hasActiveSubscription) {
    return <Navigate to="/subscription" state={{ from: location }} replace />;
  }

  // Check if we have a contract signature
  useEffect(() => {
    const checkContractStatus = async () => {
      if (user && hasActiveSubscription && subscription && subscription.contract_signed !== true) {
        // If subscription exists but contract not signed, redirect to contract signing
        toast.warning('יש להשלים את חתימת החוזה', {
          id: 'contract-required',
          duration: 6000,
          action: {
            label: 'חתום עכשיו',
            onClick: () => window.location.href = `/subscription/${subscription.plan_type}`
          }
        });
      }
    };
    
    checkContractStatus();
  }, [user, hasActiveSubscription, subscription]);

  // All checks passed, render children
  return <>{children}</>;
};

export default SubscribedRoute;
