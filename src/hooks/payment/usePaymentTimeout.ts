
import { useEffect, useCallback, useState } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

// Tiered timeout strategy with increasing severity
const INITIAL_TIMEOUT = 30000; // 30 seconds
const EXTENDED_TIMEOUT = 60000; // 60 seconds
const FINAL_TIMEOUT = 120000;   // 2 minutes

interface UsePaymentTimeoutProps {
  paymentStatus: PaymentStatus;
  onTimeout: () => void;
  onFinalTimeout?: () => void;
}

export const usePaymentTimeout = ({ 
  paymentStatus, 
  onTimeout, 
  onFinalTimeout 
}: UsePaymentTimeoutProps) => {
  const [timeoutStage, setTimeoutStage] = useState<number>(0);
  
  // Reset timeout stage when payment status changes
  useEffect(() => {
    if (paymentStatus !== PaymentStatus.PROCESSING) {
      setTimeoutStage(0);
    }
  }, [paymentStatus]);

  // First level timeout - warning
  const handleInitialTimeout = useCallback(() => {
    if (paymentStatus === PaymentStatus.PROCESSING) {
      console.log('Payment processing initial timeout reached');
      setTimeoutStage(1);
      toast.warning('העיבוד נמשך זמן רב, ממשיך לנסות...');
    }
  }, [paymentStatus]);

  // Second level timeout - extended warning
  const handleExtendedTimeout = useCallback(() => {
    if (paymentStatus === PaymentStatus.PROCESSING && timeoutStage === 1) {
      console.log('Payment processing extended timeout reached');
      setTimeoutStage(2);
      toast.warning('העיבוד עדיין נמשך, בודק סטטוס...');
      // Trigger user-provided timeout callback
      onTimeout();
    }
  }, [paymentStatus, timeoutStage, onTimeout]);

  // Final timeout - error
  const handleFinalTimeout = useCallback(() => {
    if (paymentStatus === PaymentStatus.PROCESSING && timeoutStage === 2) {
      console.log('Payment processing final timeout reached');
      setTimeoutStage(3);
      toast.error('עיבוד התשלום נמשך זמן רב מדי. אנא נסה שנית.');
      
      // If onFinalTimeout is provided, call it, otherwise call onTimeout
      if (onFinalTimeout) {
        onFinalTimeout();
      } else {
        onTimeout();
      }
    }
  }, [paymentStatus, timeoutStage, onTimeout, onFinalTimeout]);

  // Set up tiered timeouts
  useEffect(() => {
    let initialTimeoutId: number | null = null;
    let extendedTimeoutId: number | null = null;
    let finalTimeoutId: number | null = null;
    
    if (paymentStatus === PaymentStatus.PROCESSING) {
      // Clear any existing timeouts when status changes to processing
      initialTimeoutId = window.setTimeout(handleInitialTimeout, INITIAL_TIMEOUT);
      extendedTimeoutId = window.setTimeout(handleExtendedTimeout, EXTENDED_TIMEOUT);
      finalTimeoutId = window.setTimeout(handleFinalTimeout, FINAL_TIMEOUT);
    }
    
    // Cleanup function to ensure all timeouts are cleared
    return () => {
      if (initialTimeoutId) window.clearTimeout(initialTimeoutId);
      if (extendedTimeoutId) window.clearTimeout(extendedTimeoutId);
      if (finalTimeoutId) window.clearTimeout(finalTimeoutId);
    };
  }, [paymentStatus, handleInitialTimeout, handleExtendedTimeout, handleFinalTimeout]);
  
  return {
    timeoutStage
  };
};
