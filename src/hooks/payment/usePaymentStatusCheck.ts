
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus, PaymentStatusType } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const statusCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusCheckCountRef = useRef<number>(0);
  const maxStatusCheckAttempts = 20;
  const statusCheckIntervalMs = 3000;
  const statusCheckTimeoutMs = 120000;
  
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
        operationType,
        planType,
        timestamp: new Date().toISOString()
      });
      
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode,
          sessionId,
          terminalNumber: '160138',
          timestamp: new Date().toISOString(),
          attempt: statusCheckCountRef.current,
          operationType
        }
      });
      
      console.log('Payment status check response:', data);
      
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
        console.log(`Payment is still processing (attempt ${statusCheckCountRef.current})`);
        
        if (
          statusCheckCountRef.current * statusCheckIntervalMs >= statusCheckTimeoutMs ||
          statusCheckCountRef.current >= maxStatusCheckAttempts
        ) {
          console.log('Payment processing timeout exceeded');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error('תהליך התשלום לקח יותר מדי זמן. אנא נסה שנית.');
          clearStatusCheckTimer();
          return;
        }
        
        statusCheckTimerRef.current = setTimeout(() => {
          checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        }, statusCheckIntervalMs);
      }
    } catch (error) {
      console.error('Exception checking payment status:', error);
      
      if (statusCheckCountRef.current > 3) {
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error('אירעה שגיאה בבדיקת סטטוס התשלום');
      } else {
        statusCheckTimerRef.current = setTimeout(() => {
          checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        }, statusCheckIntervalMs);
      }
    }
  }, [setState]);
  
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
    }, 2000);
  }, [setState, checkPaymentStatus]);
  
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
