
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useSubscriptionActions } from '@/services/subscription/hooks/useSubscriptionActions';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useUnprocessedPayments } from './useUnprocessedPayments';
import { useSubscriptionRefresh } from './useSubscriptionRefresh';
import { UseSubscriptionReturn, UseSubscriptionOptions } from './types';

export const useSubscription = (
  options: UseSubscriptionOptions = {}
): UseSubscriptionReturn => {
  const { user } = useAuth();
  const { subscription: contextSubscription, refreshSubscription: contextRefresh, hasActiveSubscription } = useSubscriptionContext();
  const [error, setError] = useState<string | null>(null);

  // Initialize subscription actions
  const {
    subscription,
    details,
    status: { loading },
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription: actionsRefresh
  } = useSubscriptionActions({
    userId: user?.id,
    subscriptionId: contextSubscription?.id,
    onError: (error) => {
      setError(error.message || 'שגיאה בטעינת נתוני המנוי');
      toast.error(error.message || 'שגיאה בטעינת נתוני המנוי');
      
      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
    }
  });

  // Initialize unprocessed payments check
  const { isCheckingPayments, checkForUnprocessedPayments } = useUnprocessedPayments(user?.id, user?.email);

  // Initialize subscription refresh
  const { error: refreshError, refreshSubscription } = useSubscriptionRefresh(
    actionsRefresh,
    contextRefresh,
    options.onError
  );

  // Update error if refreshError is set
  useEffect(() => {
    if (refreshError) {
      setError(refreshError);
    }
  }, [refreshError]);

  // Enhanced function to load subscription data when user changes
  useEffect(() => {
    let isMounted = true;
    
    if (user?.id && options.autoRefresh !== false) {
      refreshSubscription().catch((err) => {
        if (isMounted) {
          console.error('Error refreshing subscription:', err);
          setError('שגיאה בטעינת נתוני המנוי');
        }
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, refreshSubscription, options.autoRefresh]);
  
  // Automatically check for unprocessed payments when the component mounts
  useEffect(() => {
    let isMounted = true;
    
    if (user?.id && user?.email) {
      checkForUnprocessedPayments().catch(err => {
        if (isMounted) {
          console.error('Error checking for unprocessed payments:', err);
        }
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, checkForUnprocessedPayments]);

  return { 
    subscription: subscription || contextSubscription, // Prioritize subscription from actions, fallback to context
    loading: loading || isCheckingPayments, 
    details, 
    error,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
    checkForUnprocessedPayments
  };
};
