
import { useState, useCallback } from 'react';
import { PaymentStatus, PaymentStatusType } from '@/types/payment';

interface PaymentState {
  paymentStatus: PaymentStatusType;
  terminalNumber: string;
  cardcomUrl: string;
  lowProfileCode: string;
  sessionId: string;
  reference: string;
}

interface UsePaymentStatusProps {
  onPaymentComplete: () => void;
}

export const usePaymentStatus = ({ onPaymentComplete }: UsePaymentStatusProps) => {
  const [state, setState] = useState<PaymentState>({
    paymentStatus: PaymentStatus.IDLE,
    terminalNumber: '',
    cardcomUrl: '',
    lowProfileCode: '',
    sessionId: '',
    reference: '',
  });

  const handlePaymentSuccess = useCallback(() => {
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
    onPaymentComplete();
  }, [onPaymentComplete]);

  const handleError = useCallback((message: string) => {
    console.error('Payment error:', message);
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
  }, []);

  return {
    state,
    setState,
    handlePaymentSuccess,
    handleError
  };
};
