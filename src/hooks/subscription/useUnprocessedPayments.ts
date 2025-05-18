
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnprocessedPayments = (userId?: string, userEmail?: string) => {
  const [isCheckingPayments, setIsCheckingPayments] = useState<boolean>(false);
  
  const checkForUnprocessedPayments = useCallback(async (): Promise<boolean> => {
    if (!userId || !userEmail) return false;
    
    setIsCheckingPayments(true);
    try {
      // Check for unprocessed webhooks with this user's email
      const { data: webhooks, error: webhookError } = await supabase
        .from('payment_webhooks')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (webhookError) {
        console.error('Error checking for unprocessed webhooks:', webhookError);
        return false;
      }
      
      // Manually filter webhooks that contain the user's email in the payload
      if (webhooks && webhooks.length > 0) {
        const userRelatedWebhooks = webhooks.filter(webhook => {
          // Ensure payload is an object before accessing properties
          if (typeof webhook.payload !== 'object' || webhook.payload === null) return false;
          
          const payload = webhook.payload as Record<string, any>;
          
          // Safely access nested properties
          const tranzactionInfo = payload.TranzactionInfo || {};
          const uiValues = payload.UIValues || {};
          
          const tranzactionEmail = typeof tranzactionInfo === 'object' ? 
            (tranzactionInfo.CardOwnerEmail || '') : '';
            
          const uiValuesEmail = typeof uiValues === 'object' ? 
            (uiValues.CardOwnerEmail || '') : '';
          
          // Return true if the email is found in either location
          return tranzactionEmail.toString().toLowerCase().includes(userEmail.toLowerCase()) || 
                 uiValuesEmail.toString().toLowerCase().includes(userEmail.toLowerCase());
        });
        
        if (userRelatedWebhooks.length > 0) {
          console.log('Found unprocessed webhook(s) for user email:', userEmail, userRelatedWebhooks.length);
          return true;
        }
      }
      
      // If no webhook found by email, check by specific LowProfileId from known tokens
      // This is a fallback mechanism
      const { data: payments } = await supabase
        .from('user_payment_logs')
        .select('token')
        .eq('user_id', userId)
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
            .limit(10);
            
          if (tokenWebhooks && tokenWebhooks.length > 0) {
            // Manually filter to find webhooks matching this token
            const matchingWebhooks = tokenWebhooks.filter(webhook => {
              // Ensure payload is an object before accessing properties
              if (typeof webhook.payload !== 'object' || webhook.payload === null) return false;
              
              const payload = webhook.payload as Record<string, any>;
              return payload.LowProfileId === payment.token;
            });
            
            if (matchingWebhooks.length > 0) {
              console.log('Found unprocessed webhook by token:', payment.token);
              return true;
            }
          }
        }
      }
      
      // Also check recurring_payments table for this user
      const { data: recurringPayments, error: recurringError } = await supabase
        .from('recurring_payments')
        .select('token, is_valid, token_expiry')
        .eq('user_id', userId)
        .eq('is_valid', true)
        .gte('token_expiry', new Date().toISOString().split('T')[0])
        .limit(1);
        
      if (recurringError) {
        console.error('Error checking recurring payments:', recurringError);
      } else {
        if (recurringPayments && recurringPayments.length === 0) {
          console.log('User has no valid recurring payment token');
          // This could indicate a potential inconsistency
          return true;
        }
      }
      
      return false;
    } catch (err) {
      console.error('Error in checkForUnprocessedPayments:', err);
      return false;
    } finally {
      // Always clear the loading state
      setIsCheckingPayments(false);
    }
  }, [userId, userEmail]);

  return {
    isCheckingPayments,
    checkForUnprocessedPayments
  };
};
