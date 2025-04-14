
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentStatus } from '@/components/payment/utils/paymentHelpers';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const statusCheckTimerRef = useRef<number | null>(null);

  const startStatusCheck = (lpCode: string, sId: string) => {
    setTimeout(() => {
      checkPaymentStatus(lpCode, sId);
      
      statusCheckTimerRef.current = window.setInterval(() => {
        checkPaymentStatus(lpCode, sId);
      }, 3000);
    }, 5000);
  };

  const checkPaymentStatus = async (lpCode: string, sId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode: lpCode,
          sessionId: sId
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log('Payment status check result:', data);
      
      if (data.status === 'completed' || data.status === 'failed') {
        if (statusCheckTimerRef.current) {
          window.clearInterval(statusCheckTimerRef.current);
          statusCheckTimerRef.current = null;
        }
        
        setState(prev => ({
          ...prev,
          paymentStatus: data.status === 'completed' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED
        }));
        
        if (data.status === 'completed') {
          toast.success('התשלום בוצע בהצלחה!');
        } else {
          toast.error(data.message || 'התשלום נכשל');
        }
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
    }
  };

  const cleanupStatusCheck = () => {
    if (statusCheckTimerRef.current) {
      window.clearInterval(statusCheckTimerRef.current);
      statusCheckTimerRef.current = null;
    }
  };

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck,
  };
};
