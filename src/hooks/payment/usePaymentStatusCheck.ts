
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
  const maxStatusCheckAttempts = 20; // Maximum number of attempts
  const statusCheckIntervalMs = 3000; // Check every 3 seconds
  const statusCheckTimeoutMs = 120000; // Timeout after 2 minutes
  
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
      
      const timestamp = new Date().toISOString();
      
      console.log('Checking payment status:', { 
        lowProfileCode, 
        sessionId, 
        timestamp, 
        attempt: statusCheckCountRef.current,
        operationType,
        planType
      });
      
      // Call payment status check Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          action: 'check-status',
          lowProfileCode,
          sessionId
        }
      });
      
      console.log('Payment status check response:', data);
      
      if (error) {
        console.error('Error checking payment status:', error);
        
        // Only show error if we've tried several times
        if (statusCheckCountRef.current > 3) {
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error('שגיאה בבדיקת סטטוס התשלום');
        }
        return;
      }
      
      if (data?.success) {
        // Payment was successful, update state
        console.log('Payment successful:', data);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
        toast.success('התשלום בוצע בהצלחה!');
        clearStatusCheckTimer();
        return;
      }
      
      if (data?.failed) {
        // Payment failed, update state
        console.error('Payment failed:', data);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error(data.message || 'התשלום נכשל');
        clearStatusCheckTimer();
        return;
      }
      
      // Payment still processing, continue checking
      if (data?.processing) {
        console.log(`Payment is still processing`, { 
          attempt: statusCheckCountRef.current,
          operationType
        });
        
        // Check if we've exceeded the timeout period
        if (
          statusCheckCountRef.current * statusCheckIntervalMs >= statusCheckTimeoutMs ||
          statusCheckCountRef.current >= maxStatusCheckAttempts
        ) {
          console.log(`Payment processing timeout exceeded for ${operationType} after ${statusCheckTimeoutMs / 1000} seconds`);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error('תהליך התשלום לקח יותר מדי זמן. אנא נסה שנית.');
          clearStatusCheckTimer();
          return;
        }
        
        // Schedule next check
        statusCheckTimerRef.current = setTimeout(() => {
          checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        }, statusCheckIntervalMs);
      }
    } catch (error) {
      console.error('Exception checking payment status:', error);
      
      // Only update state if we've tried several times
      if (statusCheckCountRef.current > 3) {
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error('אירעה שגיאה בבדיקת סטטוס התשלום');
      } else {
        // Try again for early errors
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
    // Clear any existing timers
    clearStatusCheckTimer();
    
    // Reset counter
    statusCheckCountRef.current = 0;
    
    // Set initial state
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
    
    // Start checking after a short delay to allow CardCom to process the payment
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
