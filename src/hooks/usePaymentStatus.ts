
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';

export const usePaymentStatus = (
  redirectOnSuccess: string = '/my-subscription'
) => {
  const [isChecking, setIsChecking] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [paymentProcessingId, setPaymentProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const checkPaymentStatus = useCallback(async (profileId?: string, planId?: string) => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const lowProfileId = params.get('lowProfileId') || localStorage.getItem('payment_pending_id') || profileId;
    const paymentPlanId = params.get('planId') || localStorage.getItem('payment_pending_plan') || planId;
    
    // Check for stale payment sessions (older than 2 hours)
    const sessionCreatedStr = localStorage.getItem('payment_session_created');
    if (sessionCreatedStr) {
      const sessionCreated = new Date(sessionCreatedStr);
      const now = new Date();
      const twoHoursInMs = 2 * 60 * 60 * 1000;
      if (now.getTime() - sessionCreated.getTime() > twoHoursInMs) {
        // Clear stale session data
        console.log('Clearing stale payment session data');
        localStorage.removeItem('payment_pending_id');
        localStorage.removeItem('payment_pending_plan');
        localStorage.removeItem('payment_processing');
        localStorage.removeItem('payment_session_created');
        return;
      }
    }
    
    // Check if we're already processing this payment
    const storedProcessingId = localStorage.getItem('payment_processing');
    if (storedProcessingId && storedProcessingId === lowProfileId) {
      // We're already processing this payment, don't duplicate
      console.log('Already processing payment:', storedProcessingId);
      setPaymentProcessingId(storedProcessingId);
      return;
    }
    
    if ((success === 'true' || profileId) && lowProfileId) {
      // Store that we're processing a payment to avoid duplicate checks
      localStorage.setItem('payment_processing', lowProfileId);
      setPaymentProcessingId(lowProfileId);
      
      setIsChecking(true);
      try {
        console.log('Checking payment status for lowProfileId:', lowProfileId);
        
        // First check if we already have this payment recorded through the webhook
        const { data: existingPayment, error: checkError } = await supabase.rpc('check_duplicate_payment', {
          low_profile_id: lowProfileId
        });
        
        if (checkError) {
          console.error('Error checking for duplicate payment:', checkError);
          throw new Error(checkError.message);
        }
        
        if (existingPayment) {
          console.log('Payment already processed via webhook');
          setPaymentSuccess(true);
          
          // Success message based on plan type
          if (paymentPlanId === 'monthly') {
            toast.success('נרשמת בהצלחה לחודש ניסיון חינם!');
          } else if (paymentPlanId === 'annual') {
            toast.success('נרשמת בהצלחה למנוי שנתי!');
          } else if (paymentPlanId === 'vip') {
            toast.success('נרשמת בהצלחה למנוי VIP לכל החיים!');
          } else {
            toast.success('התשלום התקבל בהצלחה!');
          }
          
          // Clean up the payment processing flag
          localStorage.removeItem('payment_processing');
          localStorage.removeItem('payment_pending_id');
          localStorage.removeItem('payment_pending_plan');
          localStorage.removeItem('payment_session_created');
          setPaymentProcessingId(null);
          
          // Allow toasts to be shown before redirecting
          setTimeout(() => {
            navigate(redirectOnSuccess, { replace: true });
          }, 2000);
          
          return;
        }

        // If not already processed by webhook, check status with the API
        const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
          body: { 
            lowProfileId,
            planId: paymentPlanId // Pass along the plan ID for better context
          }
        });
        
        if (error) {
          console.error('Error from cardcom-check-status function:', error);
          throw new Error(error.message);
        }
        
        console.log('Received payment status response:', data);
        
        // Check if the transaction was successful
        if (data.ResponseCode === 0 || 
            (data.OperationResponse === '0') || 
            (data.TranzactionInfo && data.TranzactionInfo.ResponseCode === 0)) {
          
          // If this is a registration flow, process the registration data
          const storedData = sessionStorage.getItem('registration_data');
          if (storedData && !user) {
            try {
              const registrationData = JSON.parse(storedData);
              
              // Record successful payment in the database
              await supabase.from('user_payment_logs').insert({
                token: lowProfileId,
                status: 'completed',
                amount: registrationData.planPrice || 0,
                transaction_details: {
                  planId: paymentPlanId,
                  registrationData,
                  cardcomResponse: data
                }
              });
              
              console.log('Payment recorded for registration flow');
            } catch (err) {
              console.error('Error processing registration data:', err);
            }
          } else if (user) {
            // For authenticated users, update their subscription status
            const now = new Date();
            
            // Prepare subscription data based on plan
            let subscriptionData: any = {
              user_id: user.id,
              plan_type: paymentPlanId,
              status: paymentPlanId === 'monthly' ? 'trial' : 'active',
              payment_method: data.UIValues || {},
              contract_signed: true,
              contract_signed_at: now.toISOString(),
              updated_at: now.toISOString()
            };
            
            // Set appropriate dates based on plan
            if (paymentPlanId === 'monthly') {
              // Trial period - 1 month
              const trialEnd = new Date(now);
              trialEnd.setMonth(trialEnd.getMonth() + 1);
              subscriptionData.trial_ends_at = trialEnd.toISOString();
              subscriptionData.next_charge_date = trialEnd.toISOString();
            } else if (paymentPlanId === 'annual') {
              // Annual subscription - 1 year
              const yearEnd = new Date(now);
              yearEnd.setFullYear(yearEnd.getFullYear() + 1);
              subscriptionData.current_period_ends_at = yearEnd.toISOString();
              subscriptionData.next_charge_date = yearEnd.toISOString();
            } else if (paymentPlanId === 'vip') {
              // VIP subscription - lifetime
              subscriptionData.status = 'active';
              subscriptionData.current_period_ends_at = null;
              subscriptionData.next_charge_date = null;
            }
            
            // Record the subscription in the database
            const { error: subscriptionError } = await supabase
              .from('subscriptions')
              .upsert(subscriptionData);
              
            if (subscriptionError) {
              console.error('Error recording subscription:', subscriptionError);
            }
            
            // Record the payment
            await supabase.from('user_payment_logs').insert({
              user_id: user.id,
              token: lowProfileId,
              status: 'completed',
              amount: data.TranzactionInfo?.Amount || 0,
              approval_code: data.TranzactionInfo?.ApprovalNumber || null,
              transaction_details: {
                planId: paymentPlanId,
                cardcomResponse: data
              }
            });
            
            console.log('Payment and subscription recorded for user:', user.id);
          }
          
          setPaymentSuccess(true);
          
          // Success message based on plan type
          if (paymentPlanId === 'monthly') {
            toast.success('נרשמת בהצלחה לחודש ניסיון חינם!');
          } else if (paymentPlanId === 'annual') {
            toast.success('נרשמת בהצלחה למנוי שנתי!');
          } else if (paymentPlanId === 'vip') {
            toast.success('נרשמת בהצלחה למנוי VIP לכל החיים!');
          } else {
            toast.success('התשלום התקבל בהצלחה!');
          }
          
          // Clean up the payment processing flag and stored data
          localStorage.removeItem('payment_processing');
          localStorage.removeItem('payment_pending_id');
          localStorage.removeItem('payment_pending_plan');
          localStorage.removeItem('payment_session_created');
          if (storedData) {
            sessionStorage.removeItem('registration_data');
          }
          setPaymentProcessingId(null);
          
          // Allow toasts to be shown before redirecting
          setTimeout(() => {
            navigate(redirectOnSuccess, { replace: true });
          }, 2000);
        } else if (retryCount < 3) {
          // Sometimes the transaction might not be processed immediately
          // Try a few times with increasing delays
          console.log(`Attempt ${retryCount + 1} failed, retrying in ${(retryCount + 1) * 2} seconds...`);
          setTimeout(() => {
            setRetryCount(prevCount => prevCount + 1);
          }, (retryCount + 1) * 2000);
        } else {
          // Clean up after max retries
          localStorage.removeItem('payment_processing');
          localStorage.removeItem('payment_pending_id');
          localStorage.removeItem('payment_pending_plan');
          localStorage.removeItem('payment_session_created');
          setPaymentProcessingId(null);
          
          setPaymentError(data.Description || 'אירעה שגיאה בתהליך התשלום');
          toast.error('אירעה שגיאה בתהליך התשלום');
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        if (retryCount < 3) {
          // Retry on error as well
          setTimeout(() => {
            setRetryCount(prevCount => prevCount + 1);
          }, (retryCount + 1) * 2000);
        } else {
          // Clean up after max retries
          localStorage.removeItem('payment_processing');
          localStorage.removeItem('payment_pending_id');
          localStorage.removeItem('payment_pending_plan');
          localStorage.removeItem('payment_session_created');
          setPaymentProcessingId(null);
          
          setPaymentError(err instanceof Error ? err.message : 'אירעה שגיאה בבדיקת סטטוס התשלום');
          toast.error('אירעה שגיאה בבדיקת סטטוס התשלום');
        }
      } finally {
        if (retryCount >= 3) {
          setIsChecking(false);
          localStorage.removeItem('payment_processing');
          localStorage.removeItem('payment_pending_id');
          localStorage.removeItem('payment_pending_plan');
          localStorage.removeItem('payment_session_created');
          setPaymentProcessingId(null);
        }
      }
    } else if (error === 'true') {
      setPaymentError('התשלום נכשל');
      toast.error('התשלום נכשל');
    }
  }, [navigate, redirectOnSuccess, retryCount, user]);
  
  useEffect(() => {
    // Check if we need to check again due to retry
    if (retryCount > 0 && paymentProcessingId) {
      checkPaymentStatus(paymentProcessingId);
      return;
    }
    
    // Don't re-check if we're already checking or have completed
    if (!isChecking && !paymentSuccess) {
      checkPaymentStatus();
    }
  }, [checkPaymentStatus, isChecking, paymentProcessingId, paymentSuccess, retryCount]);

  // Add manual check method that can be called from components
  const manualCheckPayment = (lowProfileId: string, planId?: string) => {
    if (!isChecking && !paymentSuccess) {
      checkPaymentStatus(lowProfileId, planId);
    }
  };

  return {
    isChecking,
    paymentSuccess,
    paymentError,
    manualCheckPayment
  };
};

export default usePaymentStatus;
