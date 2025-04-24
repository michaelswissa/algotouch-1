
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
  const maxStatusCheckAttempts = 40; // Increased max attempts
  const initialCheckDelayMs = 12000; // Increased initial delay
  const statusCheckTimeoutMs = 240000; // Increased timeout to 4 minutes
  
  const checkPaymentStatus = useCallback(async (
    lowProfileCode: string, 
    sessionId: string,
    operationType?: 'payment' | 'token_only',
    planType?: string
  ) => {
    if (!lowProfileCode || !sessionId) {
      console.error("Missing lowProfileCode or sessionId for status check");
      return;
    }
    
    try {
      statusCheckCountRef.current += 1;
      
      console.log('Checking payment status:', { 
        lowProfileCode, 
        sessionId, 
        attempt: statusCheckCountRef.current,
        operationType
      });
      
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          action: 'check-status',
          lowProfileCode,
          sessionId,
          timestamp: new Date().toISOString(),
          attempt: statusCheckCountRef.current,
          operationType
        }
      });
      
      if (error) {
        console.error('Error checking payment status:', error);
        
        if (statusCheckCountRef.current > 3) {
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error('שגיאה בבדיקת סטטוס התשלום');
        }
        return;
      }
      
      if (data?.success) {
        console.log('Payment successful:', data);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
        toast.success('התשלום בוצע בהצלחה!');
        clearStatusCheckTimer();
        return;
      }
      
      if (data?.failed) {
        console.error('Payment failed:', data);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error(data.message || 'התשלום נכשל');
        clearStatusCheckTimer();
        return;
      }
      
      if (data?.processing) {
        console.log(`Payment still processing (attempt ${statusCheckCountRef.current})`);
        
        if (statusCheckCountRef.current * getBackoffInterval() >= statusCheckTimeoutMs ||
            statusCheckCountRef.current >= maxStatusCheckAttempts) {
          console.log('Payment processing timeout exceeded');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error('תהליך התשלום לקח יותר מדי זמן. אנא נסה שנית.');
          clearStatusCheckTimer();
          return;
        }
        
        const nextInterval = getBackoffInterval();
        
        statusCheckTimerRef.current = setTimeout(() => {
          checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        }, nextInterval);
      }
    } catch (error) {
      console.error('Exception checking payment status:', error);
      
      if (statusCheckCountRef.current > 3) {
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error('אירעה שגיאה בבדיקת סטטוס התשלום');
      }
    }
  }, [setState]);
  
  const getBackoffInterval = () => {
    const baseInterval = 3000;
    const attempt = statusCheckCountRef.current;
    
    if (attempt <= 5) return baseInterval;
    if (attempt <= 10) return baseInterval * 1.5;
    if (attempt <= 15) return baseInterval * 2;
    return baseInterval * 3;
  };
  
  const startStatusCheck = useCallback((
    lowProfileCode: string, 
    sessionId: string,
    operationType?: 'payment' | 'token_only',
    planType?: string
  ) => {
    if (statusCheckTimerRef.current) {
      clearTimeout(statusCheckTimerRef.current);
      statusCheckTimerRef.current = null;
    }
    
    statusCheckCountRef.current = 0;
    
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
    
    statusCheckTimerRef.current = setTimeout(() => {
      checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
    }, initialCheckDelayMs);
  }, [setState, checkPaymentStatus, initialCheckDelayMs]);
  
  const clearStatusCheckTimer = useCallback(() => {
    if (statusCheckTimerRef.current) {
      clearTimeout(statusCheckTimerRef.current);
      statusCheckTimerRef.current = null;
    }
  }, []);
  
  const cleanupStatusCheck = useCallback(() => {
    clearStatusCheckTimer();
    statusCheckCountRef.current = 0;
  }, [clearStatusCheckTimer]);
  
  return { startStatusCheck, checkPaymentStatus, cleanupStatusCheck };
};
