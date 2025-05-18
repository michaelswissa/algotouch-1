
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useSubscriptionActions } from '@/services/subscription/hooks/useSubscriptionActions';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useUnprocessedPayments } from './useUnprocessedPayments';
import { useSubscriptionRefresh } from './useSubscriptionRefresh';
import { UseSubscriptionReturn, UseSubscriptionOptions } from './types';
import { Subscription, SubscriptionRecord } from '@/types/subscription';

// Helper function to ensure Subscription type compatibility
const normalizeSubscription = (sub: Subscription | SubscriptionRecord | null): Subscription | null => {
  if (!sub) return null;
  
  return {
    id: sub.id,
    user_id: sub.user_id,
    plan_id: sub.plan_id,
    plan_type: sub.plan_type || '',
    status: (sub.status as any) || 'pending',
    trial_ends_at: sub.trial_ends_at,
    current_period_ends_at: sub.current_period_ends_at,
    next_charge_at: sub.next_charge_at,
    cancelled_at: sub.cancelled_at,
    payment_method: sub.payment_method || null,
    contract_signed: sub.contract_signed,
    contract_signed_at: sub.contract_signed_at,
    token: sub.token,
    created_at: sub.created_at,
    updated_at: sub.updated_at
  };
};

export const useSubscription = (
  options: UseSubscriptionOptions = {}
): UseSubscriptionReturn => {
  const { user } = useAuth();
  const { subscription: contextSubscription, refreshSubscription: contextRefresh } = useSubscriptionContext();
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

  // Normalize the subscription data to ensure type compatibility
  const normalizedSubscription = normalizeSubscription(subscription || contextSubscription);

  return { 
    subscription: normalizedSubscription,
    loading: loading || isCheckingPayments, 
    details, 
    error,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
    checkForUnprocessedPayments
  };
};
