
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
  const navigate = useNavigate();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const error = params.get('error');
      const lowProfileId = params.get('lowProfileId');
      
      if (success === 'true' && lowProfileId) {
        setIsChecking(true);
        try {
          const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
            body: { lowProfileId }
          });
          
          if (error) {
            throw new Error(error.message);
          }
          
          if (data.ResponseCode === 0 && data.TranzactionInfo?.TranzactionId) {
            setPaymentSuccess(true);
            toast.success('התשלום התקבל בהצלחה!');
            
            // Allow toasts to be shown before redirecting
            setTimeout(() => {
              navigate(redirectOnSuccess, { replace: true });
            }, 2000);
          } else {
            setPaymentError(data.Description || 'אירעה שגיאה בתהליך התשלום');
            toast.error('אירעה שגיאה בתהליך התשלום');
          }
        } catch (err) {
          console.error('Error checking payment status:', err);
          setPaymentError(err instanceof Error ? err.message : 'אירעה שגיאה בבדיקת סטטוס התשלום');
          toast.error('אירעה שגיאה בבדיקת סטטוס התשלום');
        } finally {
          setIsChecking(false);
        }
      } else if (error === 'true') {
        setPaymentError('התשלום נכשל');
        toast.error('התשלום נכשל');
      }
    };
    
    checkPaymentStatus();
  }, [navigate, redirectOnSuccess]);

  return {
    isChecking,
    paymentSuccess,
    paymentError,
  };
};

export default usePaymentStatus;
