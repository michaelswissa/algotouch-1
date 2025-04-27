
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { SubscriptionProcessor, type Subscription, type SubscriptionDetails } from '@/lib/subscription/subscription-processor';

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const subscriptionData = await SubscriptionProcessor.fetchSubscription(user.id);
      
      if (subscriptionData) {
        // Check if subscription is expired
        const now = new Date();
        let isExpired = false;
        
        if (subscriptionData.status !== 'vip') {
          if (subscriptionData.status === 'trial' && subscriptionData.trial_ends_at) {
            isExpired = new Date(subscriptionData.trial_ends_at) < now;
          } else if (subscriptionData.current_period_ends_at) {
            isExpired = new Date(subscriptionData.current_period_ends_at) < now;
          }
        }
        
        setSubscription(subscriptionData);
        
        // Process subscription details
        const subscriptionDetails = SubscriptionProcessor.getSubscriptionDetails(subscriptionData, isExpired);
        setDetails(subscriptionDetails);
      } else {
        setSubscription(null);
        setDetails(null);
      }
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  
  useEffect(() => {
    fetchSubscription();
    
    // Set up interval to check subscription status every 30 minutes
    const checkInterval = setInterval(() => {
      fetchSubscription();
    }, 30 * 60 * 1000);
    
    return () => clearInterval(checkInterval);
  }, [fetchSubscription]);

  return { 
    subscription, 
    loading,
    error,
    details,
    refetch: fetchSubscription
  };
};
