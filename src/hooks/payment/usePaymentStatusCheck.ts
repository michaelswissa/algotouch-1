
import { useState, useCallback, useRef } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const maxAttempts = useRef(10);
  const currentAttempt = useRef(0);

  const cleanupStatusCheck = useCallback(() => {
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
    }
    currentAttempt.current = 0;
  }, []);

  const checkPaymentStatus = useCallback(async (
    lowProfileCode: string, 
    sessionId: string,
    operationType: string,
    planType: string
  ) => {
    try {
      console.log('Checking payment status:', { lowProfileCode, sessionId, operationType });
      
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode, sessionId, operationType, planType }
      });

      if (error) throw error;

      console.log('Payment status response:', data);

      if (data.success) {
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
        cleanupStatusCheck();
        return true;
      } else if (data.status === 'failed') {
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error(data.message || 'התשלום נכשל');
        cleanupStatusCheck();
        return false;
      } else if (data.status === 'error') {
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error(data.message || 'אירעה שגיאה בעיבוד התשלום');
        cleanupStatusCheck();
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking payment status:', error);
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      toast.error('אירעה שגיאה בבדיקת סטטוס התשלום');
      cleanupStatusCheck();
      return false;
    }
  }, [setState, cleanupStatusCheck]);

  const startStatusCheck = useCallback((
    lowProfileCode: string, 
    sessionId: string,
    operationType: string,
    planType: string
  ) => {
    cleanupStatusCheck();
    currentAttempt.current = 0;

    console.log('Starting payment status check for:', { lowProfileCode, sessionId });

    statusCheckInterval.current = setInterval(async () => {
      currentAttempt.current += 1;
      console.log(`Checking payment status attempt ${currentAttempt.current}/${maxAttempts.current}`);

      const isComplete = await checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
      
      if (isComplete || currentAttempt.current >= maxAttempts.current) {
        if (!isComplete && currentAttempt.current >= maxAttempts.current) {
          console.log('Max attempts reached, payment status check failed');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error('לא התקבל אישור לביצוע העסקה, נא לנסות שנית');
        }
        cleanupStatusCheck();
      }
    }, 2000); // Check every 2 seconds

    // Set a final timeout to stop checking after 30 seconds
    setTimeout(() => {
      if (statusCheckInterval.current) {
        console.log('Final timeout reached, stopping payment status check');
        cleanupStatusCheck();
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error('חלף הזמן המקסימלי לאישור העסקה, נא לנסות שנית');
      }
    }, 30000);
  }, [setState, checkPaymentStatus, cleanupStatusCheck]);

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
