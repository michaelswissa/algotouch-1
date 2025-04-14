
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPendingPaymentDetails, clearPaymentSession, isPaymentSessionValid } from '@/components/payment/utils/paymentHelpers';

interface UsePaymentStatusOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function usePaymentStatus(redirectOnSuccess?: string, options?: UsePaymentStatusOptions) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [isChecking, setIsChecking] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  
  useEffect(() => {
    const checkPaymentFromUrl = async () => {
      const success = searchParams.get('success');
      const error = searchParams.get('error');
      const lowProfileId = searchParams.get('lowProfileId');
      const planId = searchParams.get('planId');
      
      // Early return if no payment-related URL parameters
      if (!success && !error && !lowProfileId) {
        return;
      }
      
      if (error) {
        setPaymentError('התשלום בוטל או נכשל');
        return;
      }
      
      if (success === 'true' && lowProfileId) {
        setIsChecking(true);
        
        try {
          // Check payment status with Supabase
          const { data, error: apiError } = await supabase.functions.invoke('cardcom-check-status', {
            body: { lowProfileId, planId }
          });
          
          if (apiError) {
            throw new Error(`שגיאה בבדיקת סטטוס תשלום: ${apiError.message}`);
          }
          
          setPaymentData(data);
          
          if (data.success && data.status === 'completed') {
            // Successful payment
            setPaymentSuccess(true);
            setPaymentError(null);
            clearPaymentSession();
            
            // Call success callback if provided
            if (options?.onSuccess) {
              options.onSuccess();
            }
            
            // Redirect if specified
            if (redirectOnSuccess) {
              // Small delay to allow state updates
              setTimeout(() => {
                navigate(redirectOnSuccess);
              }, 1500);
            }
          } else {
            // Failed payment or still processing
            setPaymentError(data.message || 'לא ניתן לאמת את התשלום');
            
            if (options?.onError) {
              options.onError(data.message || 'לא ניתן לאמת את התשלום');
            }
          }
        } catch (err) {
          console.error('Error verifying payment:', err);
          setPaymentError(err instanceof Error ? err.message : 'שגיאה באימות התשלום');
          
          if (options?.onError) {
            options.onError(err instanceof Error ? err.message : 'שגיאה באימות התשלום');
          }
        } finally {
          setIsChecking(false);
        }
      }
    };
    
    // Check for pending payments from localStorage
    const checkPendingPayment = async () => {
      const pendingPayment = getPendingPaymentDetails();
      if (pendingPayment && isPaymentSessionValid()) {
        console.log('Found pending payment:', pendingPayment);
        
        // Only check if we're not already checking from URL
        if (!searchParams.get('success') && !searchParams.get('error') && !isChecking) {
          await manualCheckPayment(pendingPayment.lowProfileId, pendingPayment.planId);
        }
      }
    };
    
    checkPaymentFromUrl();
    checkPendingPayment();
  }, [searchParams, navigate, redirectOnSuccess, options]);
  
  // Function to manually check payment status
  const manualCheckPayment = async (lowProfileId: string, planId?: string) => {
    if (!lowProfileId) {
      return;
    }
    
    setIsChecking(true);
    
    try {
      console.log('Manually checking payment status for:', lowProfileId);
      const { data, error: apiError } = await supabase.functions.invoke('cardcom-check-status', {
        body: { lowProfileId, planId }
      });
      
      if (apiError) {
        throw new Error(`שגיאה בבדיקת סטטוס תשלום: ${apiError.message}`);
      }
      
      setPaymentData(data);
      
      if (data.success && data.status === 'completed') {
        // Successful payment
        setPaymentSuccess(true);
        setPaymentError(null);
        clearPaymentSession();
        
        // Call success callback if provided
        if (options?.onSuccess) {
          options.onSuccess();
        }
        
        // Redirect if specified
        if (redirectOnSuccess) {
          // Small delay to allow state updates
          setTimeout(() => {
            navigate(redirectOnSuccess);
          }, 1500);
        }
        
        return true;
      } else {
        // Failed payment or still processing
        setPaymentError(data.message || 'לא ניתן לאמת את התשלום');
        
        if (options?.onError) {
          options.onError(data.message || 'לא ניתן לאמת את התשלום');
        }
        
        return false;
      }
    } catch (err) {
      console.error('Error manually checking payment:', err);
      setPaymentError(err instanceof Error ? err.message : 'שגיאה באימות התשלום');
      
      if (options?.onError) {
        options.onError(err instanceof Error ? err.message : 'שגיאה באימות התשלום');
      }
      
      return false;
    } finally {
      setIsChecking(false);
    }
  };
  
  return {
    isChecking,
    paymentSuccess,
    paymentError,
    paymentData,
    manualCheckPayment
  };
}
