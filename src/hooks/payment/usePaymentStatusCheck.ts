
import { useState, useCallback, useEffect, useRef } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

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
      
      // Currently simulate a successful payment
      // In a real implementation, this would call CardCom's API
      const result = await CardComService.checkPaymentStatus(lowProfileCode);
      
      if (result.success || result.status === 'completed') {
        PaymentLogger.success('Payment completed successfully', result);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
        
        if (onSuccess) {
          onSuccess();
        }
        
        return true;
      }
      
      if (result.status === 'failed') {
        PaymentLogger.error('Payment failed', result);
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          error: result.error || 'Payment processing failed'
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
