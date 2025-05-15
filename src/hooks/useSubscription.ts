
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

  // Enhanced function to check for unprocessed payments that belong to this user
  const checkForUnprocessedPayments = useCallback(async (): Promise<boolean> => {
    if (!user?.email) return false;
    
    try {
      setIsCheckingPayments(true);
      
      // Check for unprocessed webhooks with this user's email - using CORRECT JSON query syntax
      // First attempt: Use JSON extraction with proper casting and ILIKE
      const { data: webhooks, error: webhookError } = await supabase
        .from('payment_webhooks')
        .select('*')
        .eq('processed', false)
        .or(`payload->'TranzactionInfo'->>'CardOwnerEmail' ILIKE '%${user.email}%',payload->'UIValues'->>'CardOwnerEmail' ILIKE '%${user.email}%'`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (webhookError) {
        console.error('Error checking for unprocessed webhooks:', webhookError);
        
        // Fallback approach with simpler query if the complex one fails
        const { data: basicWebhooks } = await supabase
          .from('payment_webhooks')
          .select('*')
          .eq('processed', false)
          .order('created_at', { ascending: false })
          .limit(10);
          
        // Manually filter webhooks that might be related to this user
        if (basicWebhooks && basicWebhooks.length > 0) {
          const userRelatedWebhooks = basicWebhooks.filter(webhook => {
            const payload = webhook.payload || {};
            const email1 = payload.TranzactionInfo?.CardOwnerEmail || '';
            const email2 = payload.UIValues?.CardOwnerEmail || '';
            
            return email1.toLowerCase().includes(user.email.toLowerCase()) || 
                   email2.toLowerCase().includes(user.email.toLowerCase());
          });
          
          if (userRelatedWebhooks.length > 0) {
            console.log('Found unprocessed webhook(s) with manual filtering:', userRelatedWebhooks.length);
            return true;
          }
        }
        
        return false;
      }
      
      if (webhooks && webhooks.length > 0) {
        console.log('Found unprocessed webhook(s) for user email:', user.email, webhooks.length);
        return true;
      }
      
      // If no webhook found by email, check by specific LowProfileId from known tokens
      // This is a fallback mechanism
      const { data: payments } = await supabase
        .from('user_payment_logs')
        .select('token')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (payments && payments.length > 0) {
        // For each token/LowProfileId, check if there are unprocessed webhooks
        for (const payment of payments) {
          if (!payment.token) continue;
          
          const { data: tokenWebhooks } = await supabase
            .from('payment_webhooks')
            .select('*')
            .eq('processed', false)
            .eq('payload->>LowProfileId', payment.token)
            .limit(1);
            
          if (tokenWebhooks && tokenWebhooks.length > 0) {
            console.log('Found unprocessed webhook by token:', payment.token);
            return true;
          }
        }
      }
      
      // Also check recurring_payments table for this user
      const { data: recurringPayments, error: recurringError } = await supabase
        .from('recurring_payments')
        .select('token, is_valid, token_expiry')
        .eq('user_id', user.id)
        .eq('is_valid', true)
        .gte('token_expiry', new Date().toISOString().split('T')[0])
        .limit(1);
        
      if (recurringError) {
        console.error('Error checking recurring payments:', recurringError);
      } else {
        if (recurringPayments && recurringPayments.length === 0 && subscription) {
          console.log('User has subscription but no valid recurring payment token');
          // This indicates a potential inconsistency that might need fixing
          return true;
        }
        
        // Check if there's a mismatch between subscription and recurring_payments
        if (recurringPayments?.length > 0 && subscription) {
          const recurringToken = recurringPayments[0].token;
          
          if (subscription.token !== recurringToken) {
            console.log('Token mismatch between subscription and recurring_payments');
            // There's an inconsistency that needs to be fixed
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
  }, [user, subscription]);

  // Enhanced function to load subscription data when user changes
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
    if (user?.id && user?.email) {
      checkForUnprocessedPayments().then(hasUnprocessed => {
        if (hasUnprocessed && !subscription) {
          console.log('Found unprocessed payments, user might need to sync subscription data');
        }
      }).catch(console.error);
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
