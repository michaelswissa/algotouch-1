import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useSubscription } from './useSubscription';
import { SubscriptionStatusState } from './types';
import { Subscription } from '@/types/subscription';

export const useSubscriptionStatus = (): SubscriptionStatusState => {
  const { user } = useAuth();
  const { 
    subscription, 
    loading: subscriptionLoading, 
    refreshSubscription, 
    checkForUnprocessedPayments 
  } = useSubscription();
  
  const [state, setState] = useState<Omit<SubscriptionStatusState, 'subscriptionLoading' | 'subscription' | 'handleRefresh' | 'isLoading'>>({
    loading: true,
    hasUnprocessedPayment: false,
    specificLowProfileId: '',
    isAutoProcessing: false,
    checkError: null,
    retryCount: 0,
    maxRetriesReached: false,
    loadingTimeout: false,
    criticalError: false,
  });

  // Clear registration data on component mount if subscription exists
  useEffect(() => {
    if (!subscriptionLoading && subscription) {
      sessionStorage.removeItem('registration_data');
      console.log('Registration data cleared due to existing subscription');
    }
  }, [subscriptionLoading, subscription]);
  
  // Add timeout safety to prevent infinite loading
  useEffect(() => {
    let timer: number | undefined;
    
    if (subscriptionLoading) {
      // If loading takes more than 10 seconds, show a timeout warning
      timer = window.setTimeout(() => {
        setState(prev => ({ ...prev, loadingTimeout: true }));
      }, 10000);

      // Add a critical timeout - if loading continues for too long, trigger error state
      const criticalTimer = window.setTimeout(() => {
        setState(prev => ({ ...prev, criticalError: true }));
        console.error("Critical timeout reached for subscription loading");
      }, 25000);
      
      return () => {
        if (timer) window.clearTimeout(timer);
        window.clearTimeout(criticalTimer);
      };
    } else {
      // Clear timeouts and reset timeout states when loading is finished
      setState(prev => ({ ...prev, loadingTimeout: false }));
      if (timer) window.clearTimeout(timer);
      return undefined;
    }
  }, [subscriptionLoading]);

  // Check for unprocessed payments
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!user?.id || !user?.email || subscriptionLoading) return;
      
      try {
        setState(prev => ({ ...prev, checkError: null }));
        
        // If we already have a subscription or we've retried too many times, skip the check
        if (subscription && state.retryCount > 0) return;
        
        // Don't check if we've already reached max retries
        if (state.retryCount >= 3) {
          setState(prev => ({ ...prev, maxRetriesReached: true }));
          return;
        }
        
        // Check for unprocessed payments
        const hasUnprocessed = await checkForUnprocessedPayments();
        setState(prev => ({ ...prev, hasUnprocessedPayment: hasUnprocessed }));
        
        // If there are unprocessed payments and we don't have a subscription yet, try to auto-process them
        if (hasUnprocessed && !subscription) {
          setState(prev => ({ ...prev, isAutoProcessing: true }));
          
          try {
            // Process webhook for this user
            const { data, error } = await supabase.functions.invoke('reprocess-webhook-by-email', {
              body: { 
                email: user.email,
                userId: user.id,
                forceRefresh: state.retryCount > 0 // Add more force on retry
              }
            });
            
            if (error) throw error;
            
            if (data?.success) {
              toast.success('עדכון פרטי המנוי הושלם בהצלחה');
              await refreshSubscription();
            } else {
              console.log('Auto-processing failed:', data?.message);
              setState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
            }
          } catch (err) {
            console.error('Auto-processing failed:', err);
            setState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
          } finally {
            setState(prev => ({ ...prev, isAutoProcessing: false }));
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        setState(prev => ({ 
          ...prev, 
          checkError: 'שגיאה בבדיקת סטטוס התשלום',
          retryCount: prev.retryCount + 1,
          maxRetriesReached: prev.retryCount + 1 >= 3
        }));
      }
    };
    
    // Clear any leftover registration data to avoid showing "complete registration" message
    if (!subscriptionLoading && user?.id) {
      sessionStorage.removeItem('registration_data');
    }
    
    // Only check payment status if we haven't retried too many times
    if (state.retryCount < 3) {
      checkPaymentStatus();
    }
    
    // Setup interval only if we haven't reached max retries
    let refreshInterval: number | undefined;
    if (state.retryCount < 3 && user?.id) {
      refreshInterval = window.setInterval(() => {
        if (user?.id && refreshSubscription) {
          refreshSubscription().catch(console.error);
        }
      }, 60000); // Check every minute
    }
    
    return () => {
      if (refreshInterval) {
        window.clearInterval(refreshInterval);
      }
    };
  }, [user, subscriptionLoading, subscription, checkForUnprocessedPayments, refreshSubscription, state.retryCount]);

  const handleRefresh = async () => {
    if (!refreshSubscription) return;
    
    setState(prev => ({
      ...prev,
      retryCount: 0,
      maxRetriesReached: false,
      loadingTimeout: false,
      criticalError: false
    }));
    
    try {
      await refreshSubscription();
      toast.success('הנתונים עודכנו בהצלחה');
      setState(prev => ({ ...prev, checkError: null }));
      
      // Check for unprocessed payments again
      if (user?.id && user?.email) {
        const hasUnprocessed = await checkForUnprocessedPayments();
        setState(prev => ({ ...prev, hasUnprocessedPayment: hasUnprocessed }));
      }
    } catch (err) {
      console.error('Error refreshing subscription:', err);
      toast.error('שגיאה בעדכון הנתונים');
      setState(prev => ({ ...prev, checkError: 'שגיאה בעדכון הנתונים' }));
    }
  };
  
  return {
    ...state,
    subscriptionLoading,
    subscription,
    handleRefresh,
    isLoading: subscriptionLoading || state.isAutoProcessing
  };
};
