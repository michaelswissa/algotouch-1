
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useSubscriptionActions } from '@/services/subscription/hooks/useSubscriptionActions';
import { SubscriptionDetails } from '@/services/subscription/types';

export interface UseSubscriptionReturn {
  subscription: any;
  loading: boolean;
  details: SubscriptionDetails | null;
  error: string | null;
  cancelSubscription: (reason: string, feedback?: string) => Promise<boolean>;
  reactivateSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<boolean>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  const {
    subscription,
    details,
    status: { loading },
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription
  } = useSubscriptionActions({
    userId: user?.id,
    subscriptionId: undefined, // Initialize with undefined instead of subscription.id
    onError: (error) => {
      setError(error.message || 'שגיאה בטעינת נתוני המנוי');
      toast.error(error.message || 'שגיאה בטעינת נתוני המנוי');
    }
  });

  // Load subscription data when user changes
  useEffect(() => {
    if (user?.id) {
      refreshSubscription().catch((err) => {
        console.error('Error refreshing subscription:', err);
        setError('שגיאה בטעינת נתוני המנוי');
      });
    }
  }, [user, refreshSubscription]);

  // Update subscription data when subscription changes and has an ID
  useEffect(() => {
    if (subscription?.id) {
      // This effect will run after the subscription is loaded
      // and ensures we have the latest data with the correct subscription ID
      console.log('Subscription loaded with ID:', subscription.id);
    }
  }, [subscription]);

  return { 
    subscription, 
    loading, 
    details, 
    error,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription
  };
};
