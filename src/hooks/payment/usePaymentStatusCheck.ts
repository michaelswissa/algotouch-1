
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const statusCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusCheckCountRef = useRef<number>(0);
  const maxStatusCheckAttempts = 20;
  const statusCheckIntervalMs = 3000;
  
  const checkPaymentStatus = useCallback(async (
    lowProfileCode: string, 
    sessionId: string,
    operationType?: 'payment' | 'token_only',
    planType?: string
  ) => {
    if (!lowProfileCode || !sessionId) {
      console.error("Missing required parameters for status check");
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.FAILED,
        isSubmitting: false
      }));
      return;
    }
    
    try {
      statusCheckCountRef.current += 1;
      console.log('Checking payment status:', { 
        lowProfileCode, 
        sessionId, 
        attempt: statusCheckCountRef.current,
        operationType,
        planType
      });
      
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          action: 'check-status',
          lowProfileCode,
          sessionId,
          operationType // Pass through the operation type
        }
      });
      
      if (error) {
        console.error('Error checking payment status:', error);
        if (statusCheckCountRef.current > 3) {
          setState(prev => ({ 
            ...prev, 
            paymentStatus: PaymentStatus.FAILED,
            isSubmitting: false
          }));
          toast.error('שגיאה בבדיקת סטטוס התשלום');
          clearStatusCheckTimer();
        } else {
          scheduleNextCheck(lowProfileCode, sessionId, operationType, planType);
        }
        return;
      }
      
      console.log('Payment status check response:', data);
      
      // Handle successful payment (both regular payment and token creation)
      if (data?.success) {
        console.log('Payment successful:', data);
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          isSubmitting: false,
          transactionId: data.data?.transactionId || null,
          tokenId: data.data?.token || null
        }));
        toast.success(operationType === 'token_only' ? 
          'אמצעי התשלום נשמר בהצלחה!' : 'התשלום בוצע בהצלחה!');
        clearStatusCheckTimer();
        return;
      }
      
      // Handle failed payment
      if (data?.failed) {
        console.error('Payment failed:', data);
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          isSubmitting: false
        }));
        toast.error(data.message || 'התשלום נכשל');
        clearStatusCheckTimer();
        return;
      }
      
      // Handle payment still processing
      if (data?.processing) {
        console.log('Payment still processing...');
        if (hasExceededMaxAttempts()) {
          handleTimeout(operationType);
          return;
        }
        scheduleNextCheck(lowProfileCode, sessionId, operationType, planType);
      }
    } catch (error) {
      console.error('Exception checking payment status:', error);
      if (statusCheckCountRef.current > 3) {
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          isSubmitting: false 
        }));
        toast.error('אירעה שגיאה בבדיקת סטטוס התשלום');
        clearStatusCheckTimer();
      } else {
        scheduleNextCheck(lowProfileCode, sessionId, operationType, planType);
      }
    }
  }, [setState]);
  
  const hasExceededMaxAttempts = () => {
    return statusCheckCountRef.current >= maxStatusCheckAttempts;
  };
  
  const handleTimeout = (operationType?: string) => {
    console.log(`Payment processing timeout exceeded for ${operationType}`);
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.FAILED,
      isSubmitting: false 
    }));
    toast.error(operationType === 'token_only' ? 
      'תהליך שמירת אמצעי התשלום לקח יותר מדי זמן. אנא נסה שנית.' : 
      'תהליך התשלום לקח יותר מדי זמן. אנא נסה שנית.');
    clearStatusCheckTimer();
  };
  
  const scheduleNextCheck = (
    lowProfileCode: string, 
    sessionId: string,
    operationType?: 'payment' | 'token_only',
    planType?: string
  ) => {
    statusCheckTimerRef.current = setTimeout(() => {
      checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
    }, statusCheckIntervalMs);
  };
  
  const clearStatusCheckTimer = useCallback(() => {
    if (statusCheckTimerRef.current) {
      clearTimeout(statusCheckTimerRef.current);
      statusCheckTimerRef.current = null;
    }
  }, []);
  
  const startStatusCheck = useCallback((
    lowProfileCode: string, 
    sessionId: string,
    operationType?: 'payment' | 'token_only',
    planType?: string
  ) => {
    clearStatusCheckTimer();
    statusCheckCountRef.current = 0;
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
    
    statusCheckTimerRef.current = setTimeout(() => {
      checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
    }, 2000);
  }, [setState, checkPaymentStatus, clearStatusCheckTimer]);
  
  const cleanupStatusCheck = useCallback(() => {
    clearStatusCheckTimer();
    statusCheckCountRef.current = 0;
  }, [clearStatusCheckTimer]);
  
  return { startStatusCheck, checkPaymentStatus, cleanupStatusCheck };
};
