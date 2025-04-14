
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
  
  // Function to check payment status
  const checkPaymentStatus = useCallback(async (profileId?: string, planId?: string) => {
    // Get payment parameters from URL or local storage
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
        
        // Check payment status with the dedicated function
        const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
          body: { 
            lowProfileId,
            planId: paymentPlanId
          }
        });
        
        if (error) {
          console.error('Error from cardcom-check-status function:', error);
          throw new Error(error.message);
        }
        
        console.log('Received payment status response:', data);
        
        // Check if the transaction was successful
        if (data.ResponseCode === 0 || 
            data.OperationResponse === '0' || 
            (data.TranzactionInfo && data.TranzactionInfo.ResponseCode === 0) ||
            (data.paymentLog && data.paymentLog.status === 'completed')) {
          
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
          
          // If this was a registration flow, finalize user registration
          const storedData = sessionStorage.getItem('registration_data');
          if (storedData) {
            try {
              // Registration was completed successfully
              console.log('Registration completed successfully, removing stored data');
              sessionStorage.removeItem('registration_data');
              sessionStorage.removeItem('contract_data'); // Also clear contract data
              
              // If we have login credentials, we could auto-login the user here
              const registrationData = JSON.parse(storedData);
              if (registrationData.email && registrationData.password) {
                console.log('Auto-logging in newly registered user');
                
                const { error: signInError } = await supabase.auth.signInWithPassword({
                  email: registrationData.email,
                  password: registrationData.password,
                });
                
                if (signInError) {
                  console.error('Auto-login failed:', signInError);
                }
              }
            } catch (err) {
              console.error('Error processing registration data:', err);
            }
          }
          
          // Allow toasts to be shown before redirecting
          setTimeout(() => {
            navigate(redirectOnSuccess, { replace: true });
          }, 2000);
          
          return;
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
          
          // Check for specific error codes from Cardcom
          const errorMsg = data.Description || 'אירעה שגיאה בתהליך התשלום';
          setPaymentError(errorMsg);
          toast.error(errorMsg);
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
      toast.error('התשלום נכשל, נא לנסות שוב');
      
      // Add details on what to do next
      setTimeout(() => {
        toast.info('אנא נסה שוב או צור קשר עם התמיכה', {
          duration: 5000,
          action: {
            label: 'נסה שוב',
            onClick: () => navigate('/subscription')
          }
        });
      }, 1000);
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
