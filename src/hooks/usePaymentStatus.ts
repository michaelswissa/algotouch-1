
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const usePaymentStatus = (
  redirectOnSuccess: string = '/my-subscription'
) => {
  const [isChecking, setIsChecking] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const error = params.get('error');
      const lowProfileId = params.get('lowProfileId');
      const planId = params.get('planId');
      
      if (success === 'true' && lowProfileId) {
        setIsChecking(true);
        try {
          console.log('Checking payment status for lowProfileId:', lowProfileId);
          const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
            body: { lowProfileId }
          });
          
          if (error) {
            console.error('Error from cardcom-check-status function:', error);
            throw new Error(error.message);
          }
          
          console.log('Received payment status response:', data);
          
          if (data.ResponseCode === 0 && (data.Operation || data.TranzactionInfo)) {
            setPaymentSuccess(true);
            
            // Customize success message based on plan type
            if (planId === 'monthly') {
              toast.success('נרשמת בהצלחה לחודש ניסיון חינם!');
            } else if (planId === 'annual') {
              toast.success('נרשמת בהצלחה למנוי שנתי!');
            } else if (planId === 'vip') {
              toast.success('נרשמת בהצלחה למנוי VIP לכל החיים!');
            } else {
              toast.success('התשלום התקבל בהצלחה!');
            }
            
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
            setPaymentError(err instanceof Error ? err.message : 'אירעה שגיאה בבדיקת סטטוס התשלום');
            toast.error('אירעה שגיאה בבדיקת סטטוס התשלום');
          }
        } finally {
          if (retryCount >= 3) {
            setIsChecking(false);
          }
        }
      } else if (error === 'true') {
        setPaymentError('התשלום נכשל');
        toast.error('התשלום נכשל');
      }
    };
    
    checkPaymentStatus();
  }, [navigate, redirectOnSuccess, retryCount]);

  return {
    isChecking,
    paymentSuccess,
    paymentError,
  };
};

export default usePaymentStatus;
