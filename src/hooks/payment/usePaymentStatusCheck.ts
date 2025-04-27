
import { useState, useCallback, useEffect, useRef } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { supabase } from '@/integrations/supabase/client';

interface UsePaymentStatusCheckProps {
  setState: React.Dispatch<React.SetStateAction<any>>;
  onSuccess?: () => void;
}

export const usePaymentStatusCheck = ({ setState, onSuccess }: UsePaymentStatusCheckProps) => {
  const [checkCount, setCheckCount] = useState(0);
  const maxChecks = 10; // Maximum number of status checks
  const checkInterval = 3000; // 3 seconds between checks
  const timerRef = useRef<number | null>(null);
  
  const cleanupStatusCheck = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);
  
  const checkPaymentStatus = useCallback(async (lowProfileCode: string): Promise<boolean> => {
    try {
      PaymentLogger.log('Checking payment status', { lowProfileCode, checkCount });
      
      // Real API call to cardcom-status edge function
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode }
      });

      if (error) {
        PaymentLogger.error('Error checking payment status:', error);
        throw new Error(error.message || 'שגיאה בבדיקת סטטוס התשלום');
      }
      
      PaymentLogger.log('Payment status response:', data);
      
      if (!data) {
        return false;
      }
      
      if (data.success && data.data?.isComplete) {
        PaymentLogger.success('Payment completed successfully', data);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
        
        if (onSuccess) {
          onSuccess();
        }
        
        return true;
      }
      
      if (!data.success || data.data?.status === 'failed') {
        PaymentLogger.error('Payment failed', data);
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          error: data.data?.details || data.error || 'שגיאה בתהליך התשלום'
        }));
        return false;
      }
      
      // Still processing
      return false;
    } catch (error) {
      PaymentLogger.error('Error checking payment status:', error);
      return false;
    }
  }, [checkCount, setState, onSuccess]);
  
  const startStatusCheck = useCallback((
    lowProfileCode: string, 
    sessionId: string,
    operationType: 'payment' | 'token_only',
    planType: string
  ) => {
    cleanupStatusCheck();
    setCheckCount(0);
    
    const checkStatus = async () => {
      if (checkCount >= maxChecks) {
        PaymentLogger.warn('Max status checks reached, giving up', { lowProfileCode });
        return;
      }
      
      try {
        const isComplete = await checkPaymentStatus(lowProfileCode);
        
        if (isComplete) {
          return; // Done checking
        }
        
        // Schedule next check
        setCheckCount(prev => prev + 1);
        timerRef.current = window.setTimeout(checkStatus, checkInterval);
      } catch (error) {
        PaymentLogger.error('Error during status check loop:', error);
        
        // If there's an error, try again after a longer delay unless max checks reached
        if (checkCount < maxChecks) {
          setCheckCount(prev => prev + 1);
          timerRef.current = window.setTimeout(checkStatus, checkInterval * 2);
        }
      }
    };
    
    // Start checking after a short delay
    timerRef.current = window.setTimeout(checkStatus, 1000);
  }, [cleanupStatusCheck, checkCount, maxChecks, checkPaymentStatus]);
  
  return { startStatusCheck, checkPaymentStatus, cleanupStatusCheck };
};
