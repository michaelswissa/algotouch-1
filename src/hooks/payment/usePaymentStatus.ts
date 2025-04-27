
import { useState, useCallback } from 'react';
import { PaymentStatus, PaymentStatusType } from '@/components/payment/types/payment';

interface UsePaymentStatusProps {
  onPaymentComplete: () => void;
}

export const usePaymentStatus = ({ onPaymentComplete }: UsePaymentStatusProps) => {
  const [state, setState] = useState({
    paymentStatus: PaymentStatus.IDLE as PaymentStatusType,
    isInitializing: false,
    error: null as string | null,
    lowProfileCode: '',
    sessionId: '',
    terminalNumber: '160138',
  });
  
  const handlePaymentSuccess = useCallback(() => {
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
    onPaymentComplete();
  }, [onPaymentComplete]);
  
  const handleError = useCallback((errorMessage: string) => {
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.FAILED,
      error: errorMessage
    }));
  }, []);
  
  return { state, setState, handlePaymentSuccess, handleError };
};
