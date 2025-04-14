
import { useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const checkIntervalRef = useRef<number | null>(null);

  const cleanupStatusCheck = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupStatusCheck();
  }, []);

  const startStatusCheck = (lowProfileCode: string, sessionId: string) => {
    console.log('Starting status check for LP code:', lowProfileCode);
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
    
    // Set up periodic checking
    cleanupStatusCheck();
    
    checkIntervalRef.current = window.setInterval(() => {
      checkPaymentStatus(lowProfileCode, sessionId);
    }, 3000);
    
    // Stop checking after 2 minutes (safety measure)
    setTimeout(() => {
      cleanupStatusCheck();
    }, 2 * 60 * 1000);
  };

  const checkPaymentStatus = async (lowProfileCode: string, sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode, sessionId }
      });
      
      console.log('Payment status check result:', data);
      
      if (error) {
        console.error('Error checking payment status:', error);
        return;
      }
      
      if (data.success) {
        cleanupStatusCheck();
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS 
        }));
        toast.success('התשלום בוצע בהצלחה!');
        return true;
      } else if (data.failed) {
        cleanupStatusCheck();
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED 
        }));
        toast.error(data.message || 'אירעה שגיאה בעיבוד התשלום');
        return false;
      }
    } catch (error) {
      console.error('Exception checking payment status:', error);
      return false;
    }
  };

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
