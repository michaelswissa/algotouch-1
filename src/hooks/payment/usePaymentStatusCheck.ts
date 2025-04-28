
import { useRef, useCallback } from 'react';
import { CardComService } from '@/services/payment/CardComService';
import { StorageService } from '@/services/storage/StorageService';
import { PaymentStatus } from '@/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
  onSuccess?: () => void;
}

export const usePaymentStatusCheck = ({ 
  setState,
  onSuccess
}: UsePaymentStatusCheckProps) => {
  const statusCheckIntervalRef = useRef<number | null>(null);
  const checkCountRef = useRef<number>(0);
  const MAX_CHECK_ATTEMPTS = 20; // Maximum number of check attempts
  const CHECK_INTERVAL = 2500; // Check every 2.5 seconds

  const cleanupStatusCheck = useCallback(() => {
    if (statusCheckIntervalRef.current) {
      window.clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
      checkCountRef.current = 0;
    }
  }, []);

  const checkPaymentStatus = useCallback(async (
    lowProfileCode: string
  ): Promise<boolean> => {
    if (!lowProfileCode) {
      return false;
    }
    
    try {
      const result = await CardComService.checkPaymentStatus(lowProfileCode);
      
      if (result.success) {
        // Update storage with successful payment status
        StorageService.updatePaymentData({
          status: 'completed',
          lowProfileCode,
          sessionId: lowProfileCode, // Use lowProfileCode as session ID for reference
        });
        
        PaymentLogger.log('Payment confirmed successful', { 
          lowProfileCode,
          transactionId: result.data?.transactionId || result.data?.transaction_id
        });
        
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
        cleanupStatusCheck();
        
        if (onSuccess) {
          onSuccess();
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      PaymentLogger.error('Error checking payment status:', error);
      return false;
    }
  }, [setState, cleanupStatusCheck, onSuccess]);
  
  const startStatusCheck = useCallback((
    lowProfileCode: string,
    sessionId: string,
    operationType: 'payment' | 'token_only' = 'payment',
    planId: string = ''
  ) => {
    // Clean up any existing interval first
    cleanupStatusCheck();
    
    PaymentLogger.log('Starting payment status checks', { 
      lowProfileCode,
      operationType,
      planId
    });
    
    // Update storage with pending payment status
    StorageService.updatePaymentData({
      status: 'pending',
      lowProfileCode,
      sessionId,
      reference: planId
    });
    
    // Reset check count
    checkCountRef.current = 0;
    
    // Start checking status periodically
    statusCheckIntervalRef.current = window.setInterval(async () => {
      checkCountRef.current += 1;
      
      try {
        PaymentLogger.log(`Checking payment status (attempt ${checkCountRef.current})`, {
          lowProfileCode,
          operationType
        });
        
        const success = await checkPaymentStatus(lowProfileCode);
        
        if (success) {
          PaymentLogger.log('Payment status check successful, stopping checks');
          cleanupStatusCheck();
          return;
        }
        
        // Check if we've exceeded the maximum number of attempts
        if (checkCountRef.current >= MAX_CHECK_ATTEMPTS) {
          PaymentLogger.warn('Maximum payment status check attempts reached', {
            lowProfileCode,
            attempts: checkCountRef.current
          });
          
          // Stop checking and show error
          cleanupStatusCheck();
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error('עבר זמן רב מדי ולא התקבל אישור תשלום');
          
          // Update storage with failed payment status
          StorageService.updatePaymentData({
            status: 'failed',
            lowProfileCode,
            sessionId
          });
        }
      } catch (error) {
        PaymentLogger.error('Exception during payment status check:', error);
      }
    }, CHECK_INTERVAL);
    
  }, [checkPaymentStatus, cleanupStatusCheck, setState]);

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
