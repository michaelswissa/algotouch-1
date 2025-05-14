
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useSubscriptionActions } from '@/services/subscription/hooks/useSubscriptionActions';
import { SubscriptionDetails } from '@/services/subscription/types';
import { supabase } from '@/integrations/supabase/client';

export interface UseSubscriptionReturn {
  subscription: any;
  loading: boolean;
  details: SubscriptionDetails | null;
  error: string | null;
  cancelSubscription: (reason: string, feedback?: string) => Promise<boolean>;
  reactivateSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<boolean>;
  checkForUnprocessedPayments: () => Promise<boolean>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isCheckingPayments, setIsCheckingPayments] = useState<boolean>(false);
  
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

  // Check for unprocessed payments that belong to this user
  const checkForUnprocessedPayments = useCallback(async (): Promise<boolean> => {
    if (!user?.email) return false;
    
    try {
      setIsCheckingPayments(true);
      
      // Check for unprocessed webhooks with this user's email
      const { data: webhooks, error: webhookError } = await supabase
        .from('payment_webhooks')
        .select('*')
        .eq('processed', false)
        .or(`payload->TranzactionInfo->CardOwnerEmail.eq."${user.email}",payload->UIValues->CardOwnerEmail.eq."${user.email}"`)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (webhookError) {
        console.error('Error checking for unprocessed webhooks:', webhookError);
        return false;
      }
      
      if (webhooks && webhooks.length > 0) {
        console.log('Found unprocessed webhook for user email:', user.email);
        return true;
      }
      
      // If no webhook found by email, check by specific LowProfileId from known tokens
      // This is a fallback mechanism
      const { data: payments } = await supabase
        .from('user_payment_logs')
        .select('token')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (payments && payments.length > 0) {
        // For each token/LowProfileId, check if there are unprocessed webhooks
        for (const payment of payments) {
          if (!payment.token) continue;
          
          const { data: tokenWebhooks } = await supabase
            .from('payment_webhooks')
            .select('*')
            .eq('processed', false)
            .contains('payload', { LowProfileId: payment.token })
            .limit(1);
            
          if (tokenWebhooks && tokenWebhooks.length > 0) {
            console.log('Found unprocessed webhook by token:', payment.token);
            return true;
          }
        }
      }
      
      return false;
    } catch (err) {
      console.error('Error in checkForUnprocessedPayments:', err);
      return false;
    } finally {
      setIsCheckingPayments(false);
    }
  }, [user]);

  // Load subscription data when user changes
  useEffect(() => {
    if (user?.id) {
      refreshSubscription().catch((err) => {
        console.error('Error refreshing subscription:', err);
        setError('שגיאה בטעינת נתוני המנוי');
      });
    }
  }, [user, refreshSubscription]);
  
  // Automatically check for unprocessed payments when the component mounts
  useEffect(() => {
    if (user?.id && user?.email && !subscription) {
      checkForUnprocessedPayments();
    }
  }, [user, subscription, checkForUnprocessedPayments]);

  return { 
    subscription, 
    loading: loading || isCheckingPayments, 
    details, 
    error,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
    checkForUnprocessedPayments
  };
};
