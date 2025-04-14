
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { isSubscriptionActive } from '@/components/payment/utils/paymentHelpers';

export interface SubscriptionStatus {
  isActive: boolean;
  isPending: boolean;
  isLoading: boolean;
  planType: string | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  error: string | null;
}

export const useSubscriptionStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    isActive: false,
    isPending: false,
    isLoading: true,
    planType: null,
    expiresAt: null,
    trialEndsAt: null,
    error: null
  });

  useEffect(() => {
    if (!user?.id) {
      setStatus({
        isActive: false,
        isPending: false,
        isLoading: false,
        planType: null,
        expiresAt: null,
        trialEndsAt: null,
        error: null
      });
      return;
    }

    const checkSubscription = async () => {
      try {
        setStatus(prev => ({ ...prev, isLoading: true }));
        
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          setStatus({
            isActive: false,
            isPending: false,
            isLoading: false,
            planType: null,
            expiresAt: null,
            trialEndsAt: null,
            error: null
          });
          return;
        }
        
        // Check if subscription is active
        const active = isSubscriptionActive(
          data.status, 
          data.current_period_ends_at,
          data.trial_ends_at
        );
        
        setStatus({
          isActive: active,
          isPending: data.status === 'pending',
          isLoading: false,
          planType: data.plan_type,
          expiresAt: data.current_period_ends_at,
          trialEndsAt: data.trial_ends_at,
          error: null
        });
      } catch (err) {
        console.error('Error checking subscription status:', err);
        setStatus({
          isActive: false,
          isPending: false,
          isLoading: false,
          planType: null,
          expiresAt: null,
          trialEndsAt: null,
          error: err instanceof Error ? err.message : 'An error occurred'
        });
      }
    };
    
    checkSubscription();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('public:subscriptions')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          checkSubscription();
        })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  return status;
};

export default useSubscriptionStatus;
