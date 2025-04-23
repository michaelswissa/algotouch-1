
import { useEffect, useCallback } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

const PAYMENT_TIMEOUT = 120000; // 2 minutes

interface UsePaymentTimeoutProps {
  paymentStatus: PaymentStatus;
  onTimeout: () => void;
}

export const usePaymentTimeout = ({ paymentStatus, onTimeout }: UsePaymentTimeoutProps) => {
  const handleTimeout = useCallback(() => {
    if (paymentStatus === PaymentStatus.PROCESSING) {
      console.log('Payment processing timed out');
      toast.error('עיבוד התשלום נמשך זמן רב מדי. אנא נסה שנית.');
      onTimeout();
    }
  }, [paymentStatus, onTimeout]);

  useEffect(() => {
    if (paymentStatus === PaymentStatus.PROCESSING) {
      const timeoutId = setTimeout(handleTimeout, PAYMENT_TIMEOUT);
      return () => clearTimeout(timeoutId);
    }
  }, [paymentStatus, handleTimeout]);
};
